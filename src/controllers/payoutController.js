const pool = require('../config/db');

const MIN_PAYOUT_AMOUNT = 20;

function normalizeMethodType(value) {
  const raw = String(value || '').trim().toLowerCase();

  if (raw === 'bank transfer' || raw === 'bank') return 'bank';
  if (raw === 'crypto wallet' || raw === 'crypto') return 'crypto';
  if (raw === 'paypal') return 'paypal';
  if (raw === 'other') return 'other';

  return raw;
}

async function getCreatorProfileByUserId(userId) {
  const [rows] = await pool.query(
    'SELECT id, user_id, available_balance FROM creator_profiles WHERE user_id = ? LIMIT 1',
    [userId]
  );

  return rows[0] || null;
}

async function addPayoutMethod(req, res) {
  try {
    const userId = req.user.id;
    const {
      method_type,
      method_name,
      account_name,
      account_number,
      bank_name,
      wallet_address,
      extra_data,
      is_default,
    } = req.body;

    const finalMethodType = normalizeMethodType(method_type || method_name);

    if (!['bank', 'paypal', 'crypto', 'other'].includes(finalMethodType)) {
      return res.status(400).json({
        message: 'method_type must be bank, paypal, crypto, or other',
      });
    }

    const creatorProfile = await getCreatorProfileByUserId(userId);

    if (!creatorProfile) {
      return res.status(404).json({
        message: 'Creator profile not found',
      });
    }

    const creatorId = creatorProfile.id;
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
        finalMethodType,
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
    const creatorProfile = await getCreatorProfileByUserId(userId);

    if (!creatorProfile) {
      return res.status(404).json({
        message: 'Creator profile not found',
      });
    }

    const [rows] = await pool.query(
      `SELECT *
       FROM payout_methods
       WHERE creator_id = ?
       ORDER BY is_default DESC, id DESC`,
      [creatorProfile.id]
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

    const finalAmount = Number(amount);

    if (finalAmount < MIN_PAYOUT_AMOUNT) {
      return res.status(400).json({
        message: `Minimum payout request is $${MIN_PAYOUT_AMOUNT}`,
      });
    }

    const creatorProfile = await getCreatorProfileByUserId(userId);

    if (!creatorProfile) {
      return res.status(404).json({
        message: 'Creator profile not found',
      });
    }

    const creatorId = creatorProfile.id;

    if (finalAmount > Number(creatorProfile.available_balance || 0)) {
      return res.status(400).json({
        message: 'Insufficient available balance',
      });
    }

    const [pendingRows] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_pending
       FROM payout_requests
       WHERE creator_id = ?
         AND status IN ('pending', 'approved')`,
      [creatorId]
    );

    const alreadyReserved = Number(pendingRows[0]?.total_pending || 0);
    const remainingAvailable = Number(creatorProfile.available_balance || 0) - alreadyReserved;

    if (finalAmount > remainingAvailable) {
      return res.status(400).json({
        message: 'Requested amount exceeds withdrawable balance',
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
    const creatorProfile = await getCreatorProfileByUserId(userId);

    if (!creatorProfile) {
      return res.status(404).json({
        message: 'Creator profile not found',
      });
    }

    const [rows] = await pool.query(
      `SELECT pr.*, pm.method_type
       FROM payout_requests pr
       LEFT JOIN payout_methods pm ON pm.id = pr.payout_method_id
       WHERE pr.creator_id = ?
       ORDER BY pr.id DESC`,
      [creatorProfile.id]
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
    const creatorProfile = await getCreatorProfileByUserId(userId);

    if (!creatorProfile) {
      return res.status(404).json({
        message: 'Creator profile not found',
      });
    }

    const [rows] = await pool.query(
      `SELECT *
       FROM payout_transactions
       WHERE creator_id = ?
       ORDER BY id DESC`,
      [creatorProfile.id]
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

async function getAdminPayoutRequests(req, res) {
  try {
    const status = String(req.query?.status || '').trim().toLowerCase();

    const params = [];
    let whereSql = '';

    if (status && ['pending', 'approved', 'rejected', 'paid'].includes(status)) {
      whereSql = 'WHERE pr.status = ?';
      params.push(status);
    }

    const [rows] = await pool.query(
      `SELECT
         pr.*,
         cp.user_id,
         cp.public_name,
         cp.available_balance,
         u.full_name,
         u.email,
         pm.method_type,
         pm.account_name,
         pm.account_number,
         pm.bank_name,
         pm.wallet_address
       FROM payout_requests pr
       INNER JOIN creator_profiles cp ON cp.id = pr.creator_id
       INNER JOIN users u ON u.id = cp.user_id
       LEFT JOIN payout_methods pm ON pm.id = pr.payout_method_id
       ${whereSql}
       ORDER BY pr.id DESC`,
      params
    );

    return res.status(200).json({
      payout_requests: rows,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch admin payout requests',
      error: error.message,
    });
  }
}

async function updateAdminPayoutRequestStatus(req, res) {
  try {
    const { requestId } = req.params;
    const status = String(req.body?.status || '').trim().toLowerCase();

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        message: 'status must be approved or rejected',
      });
    }

    const [rows] = await pool.query(
      'SELECT * FROM payout_requests WHERE id = ? LIMIT 1',
      [requestId]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: 'Payout request not found',
      });
    }

    const payoutRequest = rows[0];
    const currentStatus = String(payoutRequest.status || '').toLowerCase();

    if (currentStatus === 'paid') {
      return res.status(400).json({
        message: 'Paid payout request cannot be changed',
      });
    }

    await pool.query(
      `UPDATE payout_requests
       SET status = ?
       WHERE id = ?`,
      [status, requestId]
    );

    const [updatedRows] = await pool.query(
      'SELECT * FROM payout_requests WHERE id = ? LIMIT 1',
      [requestId]
    );

    return res.status(200).json({
      message: `Payout request ${status} successfully`,
      payout_request: updatedRows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to update payout request status',
      error: error.message,
    });
  }
}

async function markAdminPayoutRequestPaid(req, res) {
  try {
    const { requestId } = req.params;
    const note = String(req.body?.note || 'Admin payout settled').trim();

    const [rows] = await pool.query(
      'SELECT * FROM payout_requests WHERE id = ? LIMIT 1',
      [requestId]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: 'Payout request not found',
      });
    }

    const payoutRequest = rows[0];
    const currentStatus = String(payoutRequest.status || '').toLowerCase();

    if (currentStatus === 'paid') {
      return res.status(400).json({
        message: 'Payout request is already marked as paid',
      });
    }

    if (!['approved', 'pending'].includes(currentStatus)) {
      return res.status(400).json({
        message: 'Only pending or approved payout requests can be marked as paid',
      });
    }

    const [creatorRows] = await pool.query(
      'SELECT id, available_balance FROM creator_profiles WHERE id = ? LIMIT 1',
      [payoutRequest.creator_id]
    );

    if (!creatorRows.length) {
      return res.status(404).json({
        message: 'Creator profile not found',
      });
    }

    const creatorProfile = creatorRows[0];
    const payoutAmount = Number(payoutRequest.amount || 0);
    const currentBalance = Number(creatorProfile.available_balance || 0);

    if (payoutAmount > currentBalance) {
      return res.status(400).json({
        message: 'Creator available balance is lower than payout amount',
      });
    }

    await pool.query(
      `UPDATE creator_profiles
       SET available_balance = available_balance - ?
       WHERE id = ?`,
      [payoutAmount, payoutRequest.creator_id]
    );

    await pool.query(
      `UPDATE payout_requests
       SET status = 'paid'
       WHERE id = ?`,
      [requestId]
    );

    await pool.query(
      `INSERT INTO payout_transactions
       (
         creator_id,
         payout_request_id,
         amount,
         status,
         note,
         created_at
       )
       VALUES (?, ?, ?, 'completed', ?, NOW())`,
      [payoutRequest.creator_id, payoutRequest.id, payoutAmount, note || 'Admin payout settled']
    );

    const [updatedRows] = await pool.query(
      'SELECT * FROM payout_requests WHERE id = ? LIMIT 1',
      [requestId]
    );

    return res.status(200).json({
      message: 'Payout request marked as paid successfully',
      payout_request: updatedRows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to mark payout request as paid',
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
  getAdminPayoutRequests,
  updateAdminPayoutRequestStatus,
  markAdminPayoutRequestPaid,
};