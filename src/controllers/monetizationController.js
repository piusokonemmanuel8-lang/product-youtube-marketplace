const pool = require('../config/db');

const SUBSCRIBER_THRESHOLD = 1000;
const TOTAL_VIDEO_VIEWS_THRESHOLD = 10000;
const WATCH_HOURS_THRESHOLD = 500;

const CREATOR_SHARE_PERCENT = 55;
const PLATFORM_SHARE_PERCENT = 45;

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(4));
}

function getRevenueSharePolicy() {
  return {
    creator_share_percent: CREATOR_SHARE_PERCENT,
    platform_share_percent: PLATFORM_SHARE_PERCENT,
  };
}

function calculateRevenueSplit(grossRevenue) {
  const gross = roundMoney(grossRevenue || 0);
  const creatorShare = roundMoney((gross * CREATOR_SHARE_PERCENT) / 100);
  const platformShare = roundMoney((gross * PLATFORM_SHARE_PERCENT) / 100);

  return {
    gross_revenue: gross,
    creator_share_amount: creatorShare,
    platform_share_amount: platformShare,
    creator_share_percent: CREATOR_SHARE_PERCENT,
    platform_share_percent: PLATFORM_SHARE_PERCENT,
  };
}

async function getCreatorProfileByUserId(userId) {
  const [rows] = await pool.query(
    `SELECT *
     FROM creator_profiles
     WHERE user_id = ?
     LIMIT 1`,
    [userId]
  );

  return rows[0] || null;
}

async function getCreatorTotals(creatorId) {
  const [channelIdsRows] = await pool.query(
    `SELECT id
     FROM channels
     WHERE creator_id = ?`,
    [creatorId]
  );

  const channelIds = channelIdsRows.map((row) => row.id);

  let totalSubscribers = 0;
  let totalWatchTimeSeconds = 0;

  if (channelIds.length > 0) {
    const [subscriptionRows] = await pool.query(
      `SELECT COUNT(*) AS total_subscribers
       FROM channel_subscriptions
       WHERE channel_id IN (?)`,
      [channelIds]
    );

    totalSubscribers = Number(subscriptionRows[0]?.total_subscribers || 0);

    const [channelAnalyticsRows] = await pool.query(
      `SELECT
          COALESCE(SUM(watch_time_seconds), 0) AS total_watch_time_seconds
       FROM channel_analytics_daily
       WHERE channel_id IN (?)`,
      [channelIds]
    );

    totalWatchTimeSeconds = Number(
      channelAnalyticsRows[0]?.total_watch_time_seconds || 0
    );
  }

  const [realViewRows] = await pool.query(
    `SELECT COALESCE(COUNT(vv.id), 0) AS total_views
     FROM video_views vv
     INNER JOIN videos v ON v.id = vv.video_id
     WHERE v.creator_id = ?
       AND v.status = 'published'
       AND v.moderation_status = 'approved'
       AND v.visibility = 'public'`,
    [creatorId]
  );

  const totalVideoViews = Number(realViewRows[0]?.total_views || 0);
  const totalWatchHours = Number((totalWatchTimeSeconds / 3600).toFixed(2));

  return {
    total_subscribers: totalSubscribers,
    total_video_views: totalVideoViews,
    total_watch_time_seconds: totalWatchTimeSeconds,
    total_watch_hours: totalWatchHours,
  };
}

async function getExternalSubscriptionState(creatorId) {
  const [rows] = await pool.query(
    `SELECT *
     FROM creator_plan_subscriptions
     WHERE creator_id = ?
     ORDER BY id DESC
     LIMIT 1`,
    [creatorId]
  );

  if (!rows.length) {
    return {
      has_active_external_subscription: false,
      subscription: null,
    };
  }

  const subscription = rows[0];
  const status = String(subscription.status || '').toLowerCase();
  const endsAt = subscription.ends_at ? new Date(subscription.ends_at).getTime() : null;
  const isExpired = endsAt && !Number.isNaN(endsAt) && endsAt < Date.now();

  return {
    has_active_external_subscription: status === 'active' && !isExpired,
    subscription,
  };
}

function buildEligibility(totals, externalState) {
  const checks = {
    subscribers_met: Number(totals.total_subscribers || 0) >= SUBSCRIBER_THRESHOLD,
    total_video_views_met:
      Number(totals.total_video_views || 0) >= TOTAL_VIDEO_VIEWS_THRESHOLD,
    watch_hours_met:
      Number(totals.total_watch_hours || 0) >= WATCH_HOURS_THRESHOLD,
    external_subscription_met: !!externalState.has_active_external_subscription,
  };

  return {
    thresholds: {
      min_subscribers: SUBSCRIBER_THRESHOLD,
      min_total_video_views: TOTAL_VIDEO_VIEWS_THRESHOLD,
      min_watch_hours: WATCH_HOURS_THRESHOLD,
      external_subscription_required: true,
    },
    progress: {
      total_subscribers: Number(totals.total_subscribers || 0),
      total_video_views: Number(totals.total_video_views || 0),
      total_watch_time_seconds: Number(totals.total_watch_time_seconds || 0),
      total_watch_hours: Number(totals.total_watch_hours || 0),
      has_active_external_subscription: !!externalState.has_active_external_subscription,
    },
    checks,
    is_eligible:
      checks.subscribers_met &&
      checks.total_video_views_met &&
      checks.watch_hours_met &&
      checks.external_subscription_met,
  };
}

async function getLatestApplicationByCreatorId(creatorId) {
  const [rows] = await pool.query(
    `SELECT *
     FROM creator_monetization_applications
     WHERE creator_id = ?
     ORDER BY id DESC
     LIMIT 1`,
    [creatorId]
  );

  return rows[0] || null;
}

async function ensureMonetizationStatusRow(creatorId) {
  const [rows] = await pool.query(
    `SELECT *
     FROM creator_monetization_status
     WHERE creator_id = ?
     LIMIT 1`,
    [creatorId]
  );

  if (rows.length) {
    return rows[0];
  }

  await pool.query(
    `INSERT INTO creator_monetization_status
     (creator_id, is_monetized)
     VALUES (?, 0)`,
    [creatorId]
  );

  const [createdRows] = await pool.query(
    `SELECT *
     FROM creator_monetization_status
     WHERE creator_id = ?
     LIMIT 1`,
    [creatorId]
  );

  return createdRows[0] || null;
}

async function getCreatorMonetizationEligibility(req, res) {
  try {
    const userId = req.user.id;
    const creatorProfile = await getCreatorProfileByUserId(userId);

    if (!creatorProfile) {
      return res.status(404).json({
        message: 'Creator profile not found',
      });
    }

    const totals = await getCreatorTotals(creatorProfile.id);
    const externalState = await getExternalSubscriptionState(creatorProfile.id);
    const eligibility = buildEligibility(totals, externalState);
    const latestApplication = await getLatestApplicationByCreatorId(creatorProfile.id);
    const monetizationStatus = await ensureMonetizationStatusRow(creatorProfile.id);

    return res.status(200).json({
      creator_profile: {
        id: creatorProfile.id,
        user_id: creatorProfile.user_id,
        public_name: creatorProfile.public_name,
        status: creatorProfile.status,
        monetization_status: creatorProfile.monetization_status,
      },
      monetization_status: monetizationStatus,
      latest_application: latestApplication,
      eligibility,
      revenue_share_policy: getRevenueSharePolicy(),
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch monetization eligibility',
      error: error.message,
    });
  }
}

async function getMyMonetizationApplication(req, res) {
  try {
    const userId = req.user.id;
    const creatorProfile = await getCreatorProfileByUserId(userId);

    if (!creatorProfile) {
      return res.status(404).json({
        message: 'Creator profile not found',
      });
    }

    const latestApplication = await getLatestApplicationByCreatorId(creatorProfile.id);
    const monetizationStatus = await ensureMonetizationStatusRow(creatorProfile.id);

    return res.status(200).json({
      monetization_status: monetizationStatus,
      application: latestApplication,
      revenue_share_policy: getRevenueSharePolicy(),
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch monetization application',
      error: error.message,
    });
  }
}

async function applyForMonetization(req, res) {
  try {
    const userId = req.user.id;
    const appliedMessage = String(req.body?.applied_message || '').trim();
    const creatorProfile = await getCreatorProfileByUserId(userId);

    if (!creatorProfile) {
      return res.status(404).json({
        message: 'Creator profile not found',
      });
    }

    const totals = await getCreatorTotals(creatorProfile.id);
    const externalState = await getExternalSubscriptionState(creatorProfile.id);
    const eligibility = buildEligibility(totals, externalState);

    if (!eligibility.is_eligible) {
      return res.status(400).json({
        message: 'Creator is not yet eligible for monetization.',
        eligibility,
        revenue_share_policy: getRevenueSharePolicy(),
      });
    }

    const latestApplication = await getLatestApplicationByCreatorId(creatorProfile.id);

    if (latestApplication && String(latestApplication.status || '').toLowerCase() === 'pending') {
      return res.status(400).json({
        message: 'You already have a pending monetization application.',
        application: latestApplication,
        revenue_share_policy: getRevenueSharePolicy(),
      });
    }

    const [insertResult] = await pool.query(
      `INSERT INTO creator_monetization_applications
       (
         creator_id,
         user_id,
         status,
         subscriber_count,
         total_video_views,
         total_watch_time_seconds,
         total_watch_hours,
         has_active_external_subscription,
         applied_message
       )
       VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?)`,
      [
        creatorProfile.id,
        userId,
        Number(totals.total_subscribers || 0),
        Number(totals.total_video_views || 0),
        Number(totals.total_watch_time_seconds || 0),
        Number(totals.total_watch_hours || 0),
        externalState.has_active_external_subscription ? 1 : 0,
        appliedMessage || null,
      ]
    );

    await ensureMonetizationStatusRow(creatorProfile.id);

    await pool.query(
      `UPDATE creator_monetization_status
       SET current_application_id = ?,
           last_reviewed_at = NULL,
           last_reviewed_by = NULL,
           notes = NULL,
           updated_at = NOW()
       WHERE creator_id = ?`,
      [insertResult.insertId, creatorProfile.id]
    );

    const [rows] = await pool.query(
      `SELECT *
       FROM creator_monetization_applications
       WHERE id = ?
       LIMIT 1`,
      [insertResult.insertId]
    );

    return res.status(201).json({
      message: 'Monetization application submitted successfully.',
      application: rows[0],
      eligibility,
      revenue_share_policy: getRevenueSharePolicy(),
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to apply for monetization',
      error: error.message,
    });
  }
}

async function getAdminMonetizationApplications(req, res) {
  try {
    const status = String(req.query?.status || '').trim().toLowerCase();

    const params = [];
    let whereSql = '';

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      whereSql = 'WHERE cma.status = ?';
      params.push(status);
    }

    const [rows] = await pool.query(
      `SELECT
         cma.*,
         cp.public_name,
         u.full_name,
         u.email
       FROM creator_monetization_applications cma
       INNER JOIN creator_profiles cp ON cp.id = cma.creator_id
       INNER JOIN users u ON u.id = cma.user_id
       ${whereSql}
       ORDER BY cma.id DESC`,
      params
    );

    return res.status(200).json({
      applications: rows,
      revenue_share_policy: getRevenueSharePolicy(),
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch monetization applications',
      error: error.message,
    });
  }
}

async function getAdminMonetizationApplicationById(req, res) {
  try {
    const { applicationId } = req.params;

    const [rows] = await pool.query(
      `SELECT
         cma.*,
         cp.public_name,
         u.full_name,
         u.email
       FROM creator_monetization_applications cma
       INNER JOIN creator_profiles cp ON cp.id = cma.creator_id
       INNER JOIN users u ON u.id = cma.user_id
       WHERE cma.id = ?
       LIMIT 1`,
      [applicationId]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: 'Monetization application not found',
      });
    }

    return res.status(200).json({
      application: rows[0],
      revenue_share_policy: getRevenueSharePolicy(),
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch monetization application',
      error: error.message,
    });
  }
}

async function updateMonetizationApplicationStatus(req, res) {
  try {
    const adminUserId = req.user.id;
    const { applicationId } = req.params;
    const status = String(req.body?.status || '').trim().toLowerCase();
    const adminNote = String(req.body?.admin_note || '').trim();

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        message: 'status must be approved or rejected',
      });
    }

    const [rows] = await pool.query(
      `SELECT *
       FROM creator_monetization_applications
       WHERE id = ?
       LIMIT 1`,
      [applicationId]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: 'Monetization application not found',
      });
    }

    const application = rows[0];
    await ensureMonetizationStatusRow(application.creator_id);

    if (status === 'approved') {
      await pool.query(
        `UPDATE creator_monetization_applications
         SET status = 'approved',
             admin_note = ?,
             approved_by = ?,
             approved_at = NOW(),
             rejected_by = NULL,
             rejected_at = NULL,
             updated_at = NOW()
         WHERE id = ?`,
        [adminNote || null, adminUserId, applicationId]
      );

      await pool.query(
        `UPDATE creator_monetization_status
         SET is_monetized = 1,
             current_application_id = ?,
             monetized_at = NOW(),
             monetized_by = ?,
             last_reviewed_at = NOW(),
             last_reviewed_by = ?,
             notes = ?,
             updated_at = NOW()
         WHERE creator_id = ?`,
        [
          applicationId,
          adminUserId,
          adminUserId,
          adminNote || null,
          application.creator_id,
        ]
      );

      await pool.query(
        `UPDATE creator_profiles
         SET monetization_status = 'approved',
             updated_at = NOW()
         WHERE id = ?`,
        [application.creator_id]
      );
    } else {
      await pool.query(
        `UPDATE creator_monetization_applications
         SET status = 'rejected',
             admin_note = ?,
             rejected_by = ?,
             rejected_at = NOW(),
             approved_by = NULL,
             approved_at = NULL,
             updated_at = NOW()
         WHERE id = ?`,
        [adminNote || null, adminUserId, applicationId]
      );

      await pool.query(
        `UPDATE creator_monetization_status
         SET is_monetized = 0,
             current_application_id = ?,
             last_reviewed_at = NOW(),
             last_reviewed_by = ?,
             notes = ?,
             updated_at = NOW()
         WHERE creator_id = ?`,
        [
          applicationId,
          adminUserId,
          adminNote || null,
          application.creator_id,
        ]
      );

      await pool.query(
        `UPDATE creator_profiles
         SET monetization_status = 'rejected',
             updated_at = NOW()
         WHERE id = ?`,
        [application.creator_id]
      );
    }

    const [updatedRows] = await pool.query(
      `SELECT *
       FROM creator_monetization_applications
       WHERE id = ?
       LIMIT 1`,
      [applicationId]
    );

    return res.status(200).json({
      message: `Monetization application ${status} successfully.`,
      application: updatedRows[0],
      revenue_share_policy: getRevenueSharePolicy(),
      revenue_split_example_for_100: calculateRevenueSplit(100),
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to update monetization application status',
      error: error.message,
    });
  }
}

module.exports = {
  getCreatorMonetizationEligibility,
  getMyMonetizationApplication,
  applyForMonetization,
  getAdminMonetizationApplications,
  getAdminMonetizationApplicationById,
  updateMonetizationApplicationStatus,
  getRevenueSharePolicy,
  calculateRevenueSplit,
};