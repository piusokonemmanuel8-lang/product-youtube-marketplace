const pool = require('../config/db');

const CREATOR_SHARE_PERCENT = 55;
const PLATFORM_SHARE_PERCENT = 45;

function roundMoney(value) {
  return Number((Number(value || 0)).toFixed(4));
}

function calculateRevenueSplit(amount) {
  const grossRevenue = roundMoney(amount || 0);
  const creatorShareAmount = roundMoney((grossRevenue * CREATOR_SHARE_PERCENT) / 100);
  const platformShareAmount = roundMoney(grossRevenue - creatorShareAmount);

  return {
    gross_revenue: grossRevenue,
    creator_share_percent: CREATOR_SHARE_PERCENT,
    platform_share_percent: PLATFORM_SHARE_PERCENT,
    creator_share_amount: creatorShareAmount,
    platform_share_amount: platformShareAmount,
  };
}

async function getEligibleHostVideoOwner(viewerVideoId) {
  if (!viewerVideoId) {
    return null;
  }

  const [rows] = await pool.query(
    `SELECT
       v.id AS video_id,
       v.creator_id,
       v.title AS video_title,
       cp.user_id,
       cp.public_name,
       cms.is_monetized,
       cp.monetization_status
     FROM videos v
     INNER JOIN creator_profiles cp ON cp.id = v.creator_id
     LEFT JOIN creator_monetization_status cms ON cms.creator_id = v.creator_id
     WHERE v.id = ?
       AND v.status = 'published'
       AND v.moderation_status = 'approved'
       AND v.visibility = 'public'
     LIMIT 1`,
    [viewerVideoId]
  );

  if (!rows.length) {
    return null;
  }

  const row = rows[0];
  const isMonetized =
    Number(row.is_monetized || 0) === 1 ||
    String(row.monetization_status || '').toLowerCase() === 'approved';

  if (!isMonetized) {
    return null;
  }

  return {
    video_id: row.video_id,
    creator_id: row.creator_id,
    user_id: row.user_id,
    public_name: row.public_name,
    video_title: row.video_title,
    is_monetized: true,
  };
}

async function trackAdSkip(req, res) {
  try {
    const { impression_id, watched_seconds } = req.body;

    if (!impression_id) {
      return res.status(400).json({
        message: 'impression_id is required',
      });
    }

    const [impressions] = await pool.query(
      `SELECT ai.*, ac.cost_per_view
       FROM ad_impressions ai
       LEFT JOIN ad_campaigns ac ON ac.id = ai.campaign_id
       WHERE ai.id = ?
       LIMIT 1`,
      [impression_id]
    );

    if (!impressions.length) {
      return res.status(404).json({
        message: 'Ad impression not found',
      });
    }

    const impression = impressions[0];

    await pool.query(
      `UPDATE ad_impressions
       SET is_skipped = 1,
           watched_seconds = ?
       WHERE id = ?`,
      [
        watched_seconds || impression.watched_seconds || 0,
        impression_id,
      ]
    );

    const [updatedImpressions] = await pool.query(
      'SELECT * FROM ad_impressions WHERE id = ? LIMIT 1',
      [impression_id]
    );

    const hostVideoOwner = await getEligibleHostVideoOwner(impression.viewer_video_id);
    const debitAmount = roundMoney(impression.cost_per_view || 0);
    const baseSplit = calculateRevenueSplit(debitAmount);

    const revenueAllocation = hostVideoOwner
      ? {
          ...baseSplit,
          host_video_owner_creator_id: hostVideoOwner.creator_id,
          host_video_owner_user_id: hostVideoOwner.user_id,
          host_video_owner_public_name: hostVideoOwner.public_name,
          host_video_id: hostVideoOwner.video_id,
          host_video_title: hostVideoOwner.video_title,
          creator_share_reserved: true,
          skip_event_recorded: true,
        }
      : {
          ...baseSplit,
          creator_share_amount: 0,
          platform_share_amount: debitAmount,
          host_video_owner_creator_id: null,
          host_video_owner_user_id: null,
          host_video_owner_public_name: null,
          host_video_id: impression.viewer_video_id || null,
          host_video_title: null,
          creator_share_reserved: false,
          skip_event_recorded: true,
          note: 'No eligible monetized host creator found for this skipped ad impression',
        };

    return res.status(200).json({
      message: 'Ad skip tracked successfully',
      impression: updatedImpressions[0],
      revenue_allocation: revenueAllocation,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to track ad skip',
      error: error.message,
    });
  }
}

module.exports = {
  trackAdSkip,
  calculateRevenueSplit,
  getEligibleHostVideoOwner,
};