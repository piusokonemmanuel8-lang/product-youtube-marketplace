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
  return Number(Number(value || 0).toFixed(4));
}

function safeParseJson(value) {
  if (!value) return null;

  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch (error) {
    return null;
  }
}

function startOfDay(dateValue) {
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(dateValue) {
  const date = new Date(dateValue);
  date.setHours(23, 59, 59, 999);
  return date;
}

function toMySqlDateTime(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function buildWalletDateRange(fromDateInput, toDateInput) {
  const now = new Date();

  let fromDate;
  let toDate;

  if (fromDateInput || toDateInput) {
    fromDate = fromDateInput ? startOfDay(fromDateInput) : startOfDay(now);
    toDate = toDateInput ? endOfDay(toDateInput) : endOfDay(now);
  } else {
    toDate = endOfDay(now);
    fromDate = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));
  }

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return null;
  }

  if (fromDate.getTime() > toDate.getTime()) {
    return null;
  }

  return {
    from_date: toMySqlDateTime(fromDate),
    to_date: toMySqlDateTime(toDate),
    from_date_display: fromDate.toISOString(),
    to_date_display: toDate.toISOString(),
  };
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

    const range = buildWalletDateRange(
      req.query?.from_date || '',
      req.query?.to_date || ''
    );

    if (!range) {
      return res.status(400).json({
        message: 'Invalid date range supplied',
      });
    }

    const [transactions] = await pool.query(
      `SELECT *
       FROM creator_wallet_transactions
       WHERE creator_user_id = ?
         AND created_at BETWEEN ? AND ?
       ORDER BY id DESC
       LIMIT 100`,
      [creatorUserId, range.from_date, range.to_date]
    );

    const normalizedTransactions = transactions.map((item) => ({
      ...item,
      metadata: safeParseJson(item.metadata_json),
    }));

    return res.status(200).json({
      wallet,
      transactions: normalizedTransactions,
      filters: {
        from_date: range.from_date_display,
        to_date: range.to_date_display,
        default_range: !req.query?.from_date && !req.query?.to_date ? 'last_7_days' : 'custom',
      },
      transaction_count: normalizedTransactions.length,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch wallet',
      error: error.message,
    });
  }
}

async function getMyWalletTransactionById(req, res) {
  try {
    const creatorUserId = Number(req.user?.id || 0);
    const transactionId = Number(req.params?.transactionId || 0);

    if (!creatorUserId) {
      return res.status(401).json({
        message: 'Authenticated creator user is required',
      });
    }

    if (!transactionId) {
      return res.status(400).json({
        message: 'Valid transaction id is required',
      });
    }

    const [rows] = await pool.query(
      `SELECT *
       FROM creator_wallet_transactions
       WHERE id = ?
         AND creator_user_id = ?
       LIMIT 1`,
      [transactionId, creatorUserId]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: 'Transaction not found',
      });
    }

    const transaction = {
      ...rows[0],
      metadata: safeParseJson(rows[0].metadata_json),
    };

    return res.status(200).json({
      transaction,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch transaction',
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

async function deleteMyWalletTransaction(req, res) {
  try {
    const creatorUserId = Number(req.user?.id || 0);
    const transactionId = Number(req.params?.transactionId || 0);

    if (!creatorUserId) {
      return res.status(401).json({
        message: 'Authenticated creator user is required',
      });
    }

    if (!transactionId) {
      return res.status(400).json({
        message: 'Valid transaction id is required',
      });
    }

    const [rows] = await pool.query(
      `SELECT *
       FROM creator_wallet_transactions
       WHERE id = ?
         AND creator_user_id = ?
       LIMIT 1`,
      [transactionId, creatorUserId]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: 'Transaction not found',
      });
    }

    await pool.query(
      `DELETE FROM creator_wallet_transactions
       WHERE id = ?
         AND creator_user_id = ?
       LIMIT 1`,
      [transactionId, creatorUserId]
    );

    return res.status(200).json({
      message: 'Transaction deleted successfully',
      deleted_transaction_id: transactionId,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to delete transaction',
      error: error.message,
    });
  }
}

module.exports = {
  getOrCreateWallet,
  debitWalletForAdSpend,
  getMyWallet,
  getMyWalletTransactionById,
  topUpMyWallet,
  deleteMyWalletTransaction,
};