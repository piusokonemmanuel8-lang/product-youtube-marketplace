const crypto = require('crypto');
const pool = require('../config/db');

async function getCreatorProfileByUserId(userId) {
  const [rows] = await pool.query(
    'SELECT id FROM creator_profiles WHERE user_id = ? LIMIT 1',
    [userId]
  );

  if (!rows.length) {
    return null;
  }

  return rows[0];
}

async function subscribeToExternalPostingPlan(req, res) {
  try {
    const userId = req.user.id;
    const { plan_id, payment_provider } = req.body;

    if (!plan_id) {
      return res.status(400).json({
        message: 'plan_id is required',
      });
    }

    const creatorProfile = await getCreatorProfileByUserId(userId);

    if (!creatorProfile) {
      return res.status(403).json({
        message: 'Only creators can subscribe to external posting plans',
      });
    }

    const [plans] = await pool.query(
      `SELECT *
       FROM external_posting_plans
       WHERE id = ? AND status = 'active'
       LIMIT 1`,
      [plan_id]
    );

    if (!plans.length) {
      return res.status(404).json({
        message: 'External posting plan not found',
      });
    }

    const plan = plans[0];
    const paymentReference = `EXTPLAN-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const [subscriptionResult] = await pool.query(
      `INSERT INTO creator_plan_subscriptions
      (
        creator_id,
        plan_id,
        status,
        starts_at,
        ends_at,
        posts_used,
        amount_paid,
        currency_code,
        payment_reference
      )
      VALUES (?, ?, 'pending', NULL, NULL, 0, ?, ?, ?)`,
      [
        creatorProfile.id,
        plan.id,
        plan.price,
        plan.currency_code,
        paymentReference,
      ]
    );

    const [paymentResult] = await pool.query(
      `INSERT INTO creator_subscription_payments
      (
        creator_subscription_id,
        creator_id,
        plan_id,
        amount,
        currency_code,
        payment_provider,
        payment_reference,
        status,
        paid_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NULL)`,
      [
        subscriptionResult.insertId,
        creatorProfile.id,
        plan.id,
        plan.price,
        plan.currency_code,
        payment_provider || 'manual',
        paymentReference,
      ]
    );

    const [subscriptions] = await pool.query(
      'SELECT * FROM creator_plan_subscriptions WHERE id = ? LIMIT 1',
      [subscriptionResult.insertId]
    );

    const [payments] = await pool.query(
      'SELECT * FROM creator_subscription_payments WHERE id = ? LIMIT 1',
      [paymentResult.insertId]
    );

    return res.status(201).json({
      message: 'External posting plan subscription created successfully',
      subscription: subscriptions[0],
      payment: payments[0],
      plan,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to subscribe to external posting plan',
      error: error.message,
    });
  }
}

async function getMyExternalPostingSubscription(req, res) {
  try {
    const userId = req.user.id;

    const creatorProfile = await getCreatorProfileByUserId(userId);

    if (!creatorProfile) {
      return res.status(403).json({
        message: 'Only creators can access external posting subscriptions',
      });
    }

    const [rows] = await pool.query(
      `SELECT cps.*, epp.name AS plan_name, epp.duration_type, epp.duration_days, epp.post_limit, epp.price
       FROM creator_plan_subscriptions cps
       INNER JOIN external_posting_plans epp ON cps.plan_id = epp.id
       WHERE cps.creator_id = ?
       ORDER BY cps.id DESC
       LIMIT 1`,
      [creatorProfile.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: 'No external posting subscription found',
      });
    }

    return res.status(200).json({
      subscription: rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch external posting subscription',
      error: error.message,
    });
  }
}

async function getMyExternalPostingPayments(req, res) {
  try {
    const userId = req.user.id;

    const creatorProfile = await getCreatorProfileByUserId(userId);

    if (!creatorProfile) {
      return res.status(403).json({
        message: 'Only creators can access external posting payments',
      });
    }

    const [rows] = await pool.query(
      `SELECT csp.*, epp.name AS plan_name
       FROM creator_subscription_payments csp
       INNER JOIN external_posting_plans epp ON csp.plan_id = epp.id
       WHERE csp.creator_id = ?
       ORDER BY csp.id DESC`,
      [creatorProfile.id]
    );

    return res.status(200).json({
      payments: rows,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch external posting payments',
      error: error.message,
    });
  }
}

async function markExternalPostingPaymentPaid(req, res) {
  try {
    const userId = req.user.id;
    const { paymentId } = req.params;

    const creatorProfile = await getCreatorProfileByUserId(userId);

    if (!creatorProfile) {
      return res.status(403).json({
        message: 'Only creators can mark external posting payments',
      });
    }

    const [payments] = await pool.query(
      `SELECT *
       FROM creator_subscription_payments
       WHERE id = ? AND creator_id = ?
       LIMIT 1`,
      [paymentId, creatorProfile.id]
    );

    if (!payments.length) {
      return res.status(404).json({
        message: 'Payment not found',
      });
    }

    const payment = payments[0];

    if (payment.status === 'paid') {
      return res.status(400).json({
        message: 'Payment has already been marked as paid',
      });
    }

    const [plans] = await pool.query(
      `SELECT *
       FROM external_posting_plans
       WHERE id = ?
       LIMIT 1`,
      [payment.plan_id]
    );

    if (!plans.length) {
      return res.status(404).json({
        message: 'External posting plan not found',
      });
    }

    const plan = plans[0];
    const now = new Date();
    const endsAt = new Date(now.getTime() + (Number(plan.duration_days) * 24 * 60 * 60 * 1000));

    await pool.query(
      `UPDATE creator_subscription_payments
       SET status = 'paid',
           paid_at = ?
       WHERE id = ?`,
      [now, payment.id]
    );

    await pool.query(
      `UPDATE creator_plan_subscriptions
       SET status = 'active',
           starts_at = ?,
           ends_at = ?,
           amount_paid = ?,
           currency_code = ?
       WHERE id = ?`,
      [
        now,
        endsAt,
        payment.amount,
        payment.currency_code,
        payment.creator_subscription_id,
      ]
    );

    const [existingAuth] = await pool.query(
      `SELECT id
       FROM creator_marketplace_auth
       WHERE creator_id = ?
       LIMIT 1`,
      [creatorProfile.id]
    );

    if (!existingAuth.length) {
      await pool.query(
        `INSERT INTO creator_marketplace_auth
        (
          creator_id,
          auth_type,
          supgad_account_id,
          supgad_store_url,
          supgad_status,
          is_authenticated,
          is_internal_supgad,
          payment_required,
          verified_at
        )
        VALUES (?, 'external', NULL, NULL, 'none', 0, 0, 0, ?)`,
        [creatorProfile.id, now]
      );
    } else {
      await pool.query(
        `UPDATE creator_marketplace_auth
         SET auth_type = 'external',
             is_internal_supgad = 0,
             payment_required = 0,
             verified_at = ?
         WHERE creator_id = ?`,
        [now, creatorProfile.id]
      );
    }

    const [updatedSubscriptions] = await pool.query(
      'SELECT * FROM creator_plan_subscriptions WHERE id = ? LIMIT 1',
      [payment.creator_subscription_id]
    );

    const [updatedPayments] = await pool.query(
      'SELECT * FROM creator_subscription_payments WHERE id = ? LIMIT 1',
      [payment.id]
    );

    return res.status(200).json({
      message: 'External posting payment marked as paid successfully',
      subscription: updatedSubscriptions[0],
      payment: updatedPayments[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to mark external posting payment as paid',
      error: error.message,
    });
  }
}

module.exports = {
  subscribeToExternalPostingPlan,
  getMyExternalPostingSubscription,
  getMyExternalPostingPayments,
  markExternalPostingPaymentPaid,
};