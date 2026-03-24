const pool = require('../config/db');

async function addPayoutMethod(req, res) {
  try {
    const userId = req.user.id;
    const {
      method_type,
      account_name,
      account_number,
      bank_name,
      wallet_address,
      extra_data,
      is_default,
    } = req.body;

    if (!['bank', 'paypal', 'crypto', 'other'].includes(method_type)) {
      return res.status(400).json({
        message: 'method_type must be bank, paypal, crypto, or other',
      });
    }

    const [creatorProfiles] = await pool.query(
      'SELECT id FROM creator_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (!creatorProfiles.length) {
      return res.status(404).json({
        message: 'Creator profile not found',
      });
    }

    const creatorId = creatorProfiles[0].id;
    const finalIsDefault = is_default !== undefined ? Number(is_default) : 0;

    if (![0, 1].includes(finalIsDefault)) {
      return res.status(400).json({
        message: 'is_default must be 0 or 1',
      });
    }

    if (finalIsDefault === 1) {
      await pool.query(
        'UPDATE payout_methods SET is_default = 0 WHERE creator_id = ?',
        [creatorId]
      );
    }

    const [result] = await pool.query(
      `INSERT INTO payout_methods
      (
        creator_id,
        method_type,
        account_name,
        account_number,
        bank_name,
        wallet_address,
        extra_data,
        is_default
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        creatorId,
        method_type,
        account_name || null,
        account_number || null,
        bank_name || null,
        wallet_address || null,
        extra_data || null,
        finalIsDefault,
      ]
    );

    const [rows] = await pool.query(
      'SELECT * FROM payout_methods WHERE id = ? LIMIT 1',
      [result.insertId]
    );

    return res.status(201).json({
      message: 'Payout method added successfully',
      payout_method: rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to add payout method',
      error: error.message,
    });
  }
}

async function getMyPayoutMethods(req, res) {
  try {
    const userId = req.user.id;

    const [creatorProfiles] = await pool.query(
      'SELECT id FROM creator_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (!creatorProfiles.length) {
      return res.status(404).json({
        message: 'Creator profile not found',
      });
    }

    const creatorId = creatorProfiles[0].id;

    const [rows] = await pool.query(
      `SELECT *
       FROM payout_methods
       WHERE creator_id = ?
       ORDER BY is_default DESC, id DESC`,
      [creatorId]
    );

    return res.status(200).json({
      payout_methods: rows,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch payout methods',
      error: error.message,
    });
  }
}

async function createPayoutRequest(req, res) {
  try {
    const userId = req.user.id;
    const { payout_method_id, amount, currency_code } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        message: 'amount must be greater than 0',
      });
    }

    const [creatorProfiles] = await pool.query(
      'SELECT id, available_balance FROM creator_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (!creatorProfiles.length) {
      return res.status(404).json({
        message: 'Creator profile not found',
      });
    }

    const creatorProfile = creatorProfiles[0];
    const creatorId = creatorProfile.id;
    const finalAmount = Number(amount);

    if (finalAmount > Number(creatorProfile.available_balance)) {
      return res.status(400).json({
        message: 'Insufficient available balance',
      });
    }

    let finalPayoutMethodId = payout_method_id || null;

    if (finalPayoutMethodId) {
      const [methodRows] = await pool.query(
        'SELECT id FROM payout_methods WHERE id = ? AND creator_id = ? LIMIT 1',
        [finalPayoutMethodId, creatorId]
      );

      if (!methodRows.length) {
        return res.status(404).json({
          message: 'Payout method not found',
        });
      }
    }

    if (!finalPayoutMethodId) {
      const [defaultMethodRows] = await pool.query(
        'SELECT id FROM payout_methods WHERE creator_id = ? AND is_default = 1 LIMIT 1',
        [creatorId]
      );

      if (!defaultMethodRows.length) {
        return res.status(400).json({
          message: 'No payout method selected and no default payout method found',
        });
      }

      finalPayoutMethodId = defaultMethodRows[0].id;
    }

    const [result] = await pool.query(
      `INSERT INTO payout_requests
      (
        creator_id,
        payout_method_id,
        amount,
        currency_code,
        status,
        requested_at
      )
      VALUES (?, ?, ?, ?, 'pending', NOW())`,
      [creatorId, finalPayoutMethodId, finalAmount, currency_code || 'USD']
    );

    const [rows] = await pool.query(
      'SELECT * FROM payout_requests WHERE id = ? LIMIT 1',
      [result.insertId]
    );

    return res.status(201).json({
      message: 'Payout request created successfully',
      payout_request: rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to create payout request',
      error: error.message,
    });
  }
}

async function getMyPayoutRequests(req, res) {
  try {
    const userId = req.user.id;

    const [creatorProfiles] = await pool.query(
      'SELECT id FROM creator_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (!creatorProfiles.length) {
      return res.status(404).json({
        message: 'Creator profile not found',
      });
    }

    const creatorId = creatorProfiles[0].id;

    const [rows] = await pool.query(
      `SELECT *
       FROM payout_requests
       WHERE creator_id = ?
       ORDER BY id DESC`,
      [creatorId]
    );

    return res.status(200).json({
      payout_requests: rows,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch payout requests',
      error: error.message,
    });
  }
}

async function getMyPayoutTransactions(req, res) {
  try {
    const userId = req.user.id;

    const [creatorProfiles] = await pool.query(
      'SELECT id FROM creator_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (!creatorProfiles.length) {
      return res.status(404).json({
        message: 'Creator profile not found',
      });
    }

    const creatorId = creatorProfiles[0].id;

    const [rows] = await pool.query(
      `SELECT *
       FROM payout_transactions
       WHERE creator_id = ?
       ORDER BY id DESC`,
      [creatorId]
    );

    return res.status(200).json({
      payout_transactions: rows,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch payout transactions',
      error: error.message,
    });
  }
}

module.exports = {
  addPayoutMethod,
  getMyPayoutMethods,
  createPayoutRequest,
  getMyPayoutRequests,
  getMyPayoutTransactions,
};