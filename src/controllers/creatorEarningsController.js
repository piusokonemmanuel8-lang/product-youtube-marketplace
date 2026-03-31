const pool = require('../config/db');

const MIN_WITHDRAW_AMOUNT = 20;

function roundMoney(value) {
  return Number((Number(value || 0)).toFixed(2));
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

function buildDateRange(fromDateInput, toDateInput) {
  const now = new Date();

  let fromDate;
  let toDate;

  if (fromDateInput || toDateInput) {
    fromDate = fromDateInput ? startOfDay(fromDateInput) : startOfDay(now);
    toDate = toDateInput ? endOfDay(toDateInput) : endOfDay(now);
  } else {
    toDate = endOfDay(now);
    fromDate = startOfDay(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000));
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

async function getCreatorProfileByUserId(userId) {
  const [rows] = await pool.query(
    `SELECT id, user_id, public_name, available_balance
     FROM creator_profiles
     WHERE user_id = ?
     LIMIT 1`,
    [userId]
  );

  return rows[0] || null;
}

function normalizeTypeFilter(rawType) {
  const value = String(rawType || '').trim().toLowerCase();

  if (!value || value === 'all' || value === 'all types') {
    return '';
  }

  if (value === 'earning' || value === 'earnings' || value === 'monetization') {
    return 'monetization_earning';
  }

  return value;
}

function normalizeStatusFilter(rawStatus) {
  const value = String(rawStatus || '').trim().toLowerCase();

  if (!value || value === 'all' || value === 'all status') {
    return '';
  }

  return value;
}

async function getCreatorEarningsDashboard(req, res) {
  try {
    const userId = Number(req.user?.id || 0);

    if (!userId) {
      return res.status(401).json({
        message: 'Authenticated creator user is required',
      });
    }

    const creatorProfile = await getCreatorProfileByUserId(userId);

    if (!creatorProfile) {
      return res.status(404).json({
        message: 'Creator profile not found',
      });
    }

    const range = buildDateRange(
      req.query?.from_date || '',
      req.query?.to_date || ''
    );

    if (!range) {
      return res.status(400).json({
        message: 'Invalid date range supplied',
      });
    }

    const typeFilter = normalizeTypeFilter(req.query?.type);
    const statusFilter = normalizeStatusFilter(req.query?.status);

    const earningTypes = ['monetization_earning'];
    const payoutRequestStatuses = ['pending', 'approved', 'rejected', 'paid'];

    if (typeFilter && !earningTypes.includes(typeFilter)) {
      return res.status(400).json({
        message: 'Unsupported earnings type filter',
      });
    }

    if (statusFilter && !payoutRequestStatuses.includes(statusFilter)) {
      return res.status(400).json({
        message: 'Unsupported status filter',
      });
    }

    let earningSql = `
      SELECT
        id,
        creator_user_id,
        type,
        direction,
        amount,
        balance_before,
        balance_after,
        reference,
        description,
        metadata_json,
        created_at
      FROM creator_wallet_transactions
      WHERE creator_user_id = ?
        AND direction = 'credit'
        AND type = 'monetization_earning'
        AND created_at BETWEEN ? AND ?
    `;

    const earningParams = [userId, range.from_date, range.to_date];

    if (typeFilter) {
      earningSql += ` AND type = ?`;
      earningParams.push(typeFilter);
    }

    earningSql += ` ORDER BY id DESC`;

    const [earningRows] = await pool.query(earningSql, earningParams);

    let payoutSql = `
      SELECT
        pr.id,
        pr.amount,
        pr.status,
        pr.currency_code,
        pr.requested_at,
        pr.payout_method_id,
        pm.method_type
      FROM payout_requests pr
      LEFT JOIN payout_methods pm ON pm.id = pr.payout_method_id
      WHERE pr.creator_id = ?
        AND pr.requested_at BETWEEN ? AND ?
    `;

    const payoutParams = [creatorProfile.id, range.from_date, range.to_date];

    if (statusFilter) {
      payoutSql += ` AND pr.status = ?`;
      payoutParams.push(statusFilter);
    }

    payoutSql += ` ORDER BY pr.id DESC`;

    const [payoutRows] = await pool.query(payoutSql, payoutParams);

    const [paidRows] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_paid
       FROM payout_transactions
       WHERE creator_id = ?
         AND status = 'completed'
         AND created_at BETWEEN ? AND ?`,
      [creatorProfile.id, range.from_date, range.to_date]
    );

    const totalEarned = roundMoney(
      earningRows.reduce((sum, row) => sum + Number(row.amount || 0), 0)
    );

    const totalPaid = roundMoney(Number(paidRows[0]?.total_paid || 0));

    const availableToWithdraw = roundMoney(creatorProfile.available_balance || 0);

    const earnings = earningRows.map((row) => {
      let metadata = null;

      try {
        metadata = row.metadata_json ? JSON.parse(row.metadata_json) : null;
      } catch (error) {
        metadata = null;
      }

      return {
        id: row.id,
        type: row.type,
        direction: row.direction,
        amount: roundMoney(row.amount),
        balance_before: roundMoney(row.balance_before),
        balance_after: roundMoney(row.balance_after),
        reference: row.reference,
        description: row.description,
        metadata,
        created_at: row.created_at,
        status: 'completed',
      };
    });

    return res.status(200).json({
      creator: {
        id: creatorProfile.id,
        user_id: creatorProfile.user_id,
        public_name: creatorProfile.public_name,
      },
      summary: {
        total_earned: totalEarned,
        available_to_withdraw: availableToWithdraw,
        payout_requests_count: payoutRows.length,
        paid_out: totalPaid,
        minimum_withdrawal_amount: MIN_WITHDRAW_AMOUNT,
        withdraw_locked: availableToWithdraw < MIN_WITHDRAW_AMOUNT,
      },
      filters: {
        status: statusFilter || 'all',
        type: typeFilter || 'all',
        from_date: range.from_date_display,
        to_date: range.to_date_display,
        default_range:
          !req.query?.from_date && !req.query?.to_date ? 'last_30_days' : 'custom',
      },
      earnings,
      payout_requests: payoutRows.map((row) => ({
        id: row.id,
        amount: roundMoney(row.amount),
        status: row.status,
        currency_code: row.currency_code || 'USD',
        requested_at: row.requested_at,
        payout_method_id: row.payout_method_id,
        method_type: row.method_type || null,
      })),
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch creator earnings dashboard',
      error: error.message,
    });
  }
}

module.exports = {
  getCreatorEarningsDashboard,
};