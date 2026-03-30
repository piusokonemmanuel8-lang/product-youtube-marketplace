const crypto = require('crypto');
const pool = require('../config/db');

async function getOrCreateWallet(creatorUserId, connection = pool) {
  const [wallets] = await connection.query(
    'SELECT * FROM creator_wallets WHERE creator_user_id = ? LIMIT 1',
    [creatorUserId]
  );

  if (wallets.length) {
    return wallets[0];
  }

  const [result] = await connection.query(
    `INSERT INTO creator_wallets
    (
      creator_user_id,
      balance,
      total_funded,
      total_spent,
      status
    )
    VALUES (?, 0.0000, 0.0000, 0.0000, 'active')`,
    [creatorUserId]
  );

  const [created] = await connection.query(
    'SELECT * FROM creator_wallets WHERE id = ? LIMIT 1',
    [result.insertId]
  );

  return created[0];
}

function roundMoney(value) {
  return Number((Number(value || 0)).toFixed(4));
}

async function debitWalletForAdSpend({
  creatorUserId,
  amount,
  reference,
  description,
  metadata = {},
}) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const wallet = await getOrCreateWallet(creatorUserId, connection);

    const [lockedWalletRows] = await connection.query(
      'SELECT * FROM creator_wallets WHERE id = ? LIMIT 1 FOR UPDATE',
      [wallet.id]
    );

    if (!lockedWalletRows.length) {
      throw new Error('Wallet not found');
    }

    const lockedWallet = lockedWalletRows[0];
    const balanceBefore = roundMoney(lockedWallet.balance);
    const debitAmount = roundMoney(amount);

    if (debitAmount <= 0) {
      throw new Error('Invalid debit amount');
    }

    if (balanceBefore < debitAmount) {
      await connection.rollback();
      return {
        success: false,
        reason: 'insufficient_balance',
        wallet: lockedWallet,
      };
    }

    const balanceAfter = roundMoney(balanceBefore - debitAmount);

    await connection.query(
      `UPDATE creator_wallets
       SET balance = ?,
           total_spent = total_spent + ?
       WHERE id = ?`,
      [balanceAfter, debitAmount, lockedWallet.id]
    );

    await connection.query(
      `INSERT INTO creator_wallet_transactions
      (
        wallet_id,
        creator_user_id,
        type,
        direction,
        amount,
        balance_before,
        balance_after,
        reference,
        description,
        metadata_json
      )
      VALUES (?, ?, 'ad_spend', 'debit', ?, ?, ?, ?, ?, ?)`,
      [
        lockedWallet.id,
        creatorUserId,
        debitAmount,
        balanceBefore,
        balanceAfter,
        reference || `ad_spend_${crypto.randomUUID()}`,
        description || 'Ad spend deduction',
        JSON.stringify(metadata || {}),
      ]
    );

    await connection.commit();

    const [updatedWalletRows] = await pool.query(
      'SELECT * FROM creator_wallets WHERE id = ? LIMIT 1',
      [lockedWallet.id]
    );

    return {
      success: true,
      wallet: updatedWalletRows[0],
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      amount: debitAmount,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getMyWallet(req, res) {
  try {
    const creatorUserId = Number(req.user?.id || 0);

    if (!creatorUserId) {
      return res.status(401).json({
        message: 'Authenticated creator user is required',
      });
    }

    const wallet = await getOrCreateWallet(creatorUserId);

    const [transactions] = await pool.query(
      `SELECT *
       FROM creator_wallet_transactions
       WHERE creator_user_id = ?
       ORDER BY id DESC
       LIMIT 50`,
      [creatorUserId]
    );

    return res.status(200).json({
      wallet,
      transactions,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch wallet',
      error: error.message,
    });
  }
}

async function topUpMyWallet(req, res) {
  try {
    const creatorUserId = Number(req.user?.id || 0);
    const amount = roundMoney(req.body?.amount || 0);
    const paymentReference = String(req.body?.payment_reference || '').trim();

    if (!creatorUserId) {
      return res.status(401).json({
        message: 'Authenticated creator user is required',
      });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        message: 'Valid top up amount is required',
      });
    }

    const wallet = await getOrCreateWallet(creatorUserId);
    const balanceBefore = roundMoney(wallet.balance || 0);
    const balanceAfter = roundMoney(balanceBefore + amount);
    const reference = paymentReference || `topup_${crypto.randomUUID()}`;

    await pool.query(
      `UPDATE creator_wallets
       SET balance = ?,
           total_funded = total_funded + ?
       WHERE id = ?`,
      [balanceAfter, amount, wallet.id]
    );

    await pool.query(
      `INSERT INTO creator_wallet_transactions
      (
        wallet_id,
        creator_user_id,
        type,
        direction,
        amount,
        balance_before,
        balance_after,
        reference,
        description,
        metadata_json
      )
      VALUES (?, ?, 'topup', 'credit', ?, ?, ?, ?, ?, ?)`,
      [
        wallet.id,
        creatorUserId,
        amount,
        balanceBefore,
        balanceAfter,
        reference,
        'Wallet top up',
        JSON.stringify({
          payment_reference: paymentReference || null,
        }),
      ]
    );

    const [updatedWallets] = await pool.query(
      'SELECT * FROM creator_wallets WHERE id = ? LIMIT 1',
      [wallet.id]
    );

    return res.status(200).json({
      message: 'Wallet topped up successfully',
      wallet: updatedWallets[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to top up wallet',
      error: error.message,
    });
  }
}

module.exports = {
  getOrCreateWallet,
  debitWalletForAdSpend,
  getMyWallet,
  topUpMyWallet,
};