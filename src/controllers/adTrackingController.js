const crypto = require('crypto');
const pool = require('../config/db');

const { debitWalletForAdSpend } = require('./walletController');

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

async function pauseCampaignForWallet(campaignId) {
  await pool.query(
    `UPDATE ad_campaigns
     SET status = 'paused',
         pause_reason = 'wallet_exhausted',
         pause_notice = 'Ad paused because wallet balance reached zero',
         paused_at = NOW()
     WHERE id = ?`,
    [campaignId]
  );
}

async function pauseCampaignForDailyCap(campaignId) {
  await pool.query(
    `UPDATE ad_campaigns
     SET status = 'paused',
         pause_reason = 'daily_cap_reached',
         pause_notice = 'Ad paused because daily budget cap was reached',
         paused_at = NOW()
     WHERE id = ?`,
    [campaignId]
  );
}

function isSameUtcDay(dateA, dateB) {
  const a = new Date(dateA);
  const b = new Date(dateB);

  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

async function maybeResumeCampaignForNewDay(campaign) {
  const pauseReason = String(campaign?.pause_reason || '').toLowerCase();

  if (campaign?.status !== 'paused') {
    return campaign;
  }

  if (pauseReason !== 'daily_cap_reached') {
    return campaign;
  }

  if (!campaign?.paused_at) {
    return campaign;
  }

  const now = new Date();
  const pausedAt = new Date(campaign.paused_at);

  if (Number.isNaN(pausedAt.getTime())) {
    return campaign;
  }

  if (isSameUtcDay(pausedAt, now)) {
    return campaign;
  }

  await pool.query(
    `UPDATE ad_campaigns
     SET status = 'active',
         pause_reason = NULL,
         pause_notice = NULL,
         paused_at = NULL
     WHERE id = ?`,
    [campaign.id]
  );

  const [updatedRows] = await pool.query(
    `SELECT id, creator_user_id, title, status, cost_per_view, budget, pause_reason, pause_notice, paused_at
     FROM ad_campaigns
     WHERE id = ?
     LIMIT 1`,
    [campaign.id]
  );

  return updatedRows[0] || campaign;
}

async function getTodayCampaignSpend(campaignId) {
  const [impressionRows] = await pool.query(
    `SELECT COALESCE(SUM(ac.cost_per_view), 0) AS total
     FROM ad_impressions ai
     INNER JOIN ad_campaigns ac ON ac.id = ai.campaign_id
     WHERE ai.campaign_id = ?
       AND DATE(ai.created_at) = UTC_DATE()`,
    [campaignId]
  );

  const [clickRows] = await pool.query(
    `SELECT COALESCE(SUM(ac.cost_per_click), 0) AS total
     FROM ad_clicks adc
     INNER JOIN ad_campaigns ac ON ac.id = adc.campaign_id
     WHERE adc.campaign_id = ?
       AND DATE(adc.created_at) = UTC_DATE()`,
    [campaignId]
  );

  return roundMoney(
    Number(impressionRows[0]?.total || 0) + Number(clickRows[0]?.total || 0)
  );
}

async function trackAdImpression(req, res) {
  try {
    const {
      campaign_id,
      ad_video_id,
      viewer_video_id,
      session_id,
      is_skipped,
      watched_seconds,
    } = req.body;

    if (!campaign_id || !ad_video_id) {
      return res.status(400).json({
        message: 'campaign_id and ad_video_id are required',
      });
    }

    const [campaignRows] = await pool.query(
      `SELECT id, creator_user_id, title, status, cost_per_view, budget, pause_reason, pause_notice, paused_at
       FROM ad_campaigns
       WHERE id = ?
       LIMIT 1`,
      [campaign_id]
    );

    if (!campaignRows.length) {
      return res.status(404).json({
        message: 'Ad campaign not found',
      });
    }

    let campaign = campaignRows[0];
    campaign = await maybeResumeCampaignForNewDay(campaign);

    if (campaign.status !== 'active') {
      return res.status(400).json({
        message: 'Ad campaign is not active',
      });
    }

    const debitAmount = roundMoney(campaign.cost_per_view || 0);
    const dailySpendToday = await getTodayCampaignSpend(campaign.id);
    const dailyBudgetCap = roundMoney(campaign.budget || 0);

    if (dailyBudgetCap > 0 && roundMoney(dailySpendToday + debitAmount) > dailyBudgetCap) {
      await pauseCampaignForDailyCap(campaign.id);

      return res.status(200).json({
        message: 'Ad campaign paused because daily budget cap was reached',
        campaign_paused: true,
        pause_reason: 'daily_cap_reached',
      });
    }

    const ipAddress =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      null;

    const [result] = await pool.query(
      `INSERT INTO ad_impressions
      (
        campaign_id,
        ad_video_id,
        viewer_video_id,
        ip_address,
        session_id,
        is_skipped,
        watched_seconds
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        campaign_id,
        ad_video_id,
        viewer_video_id || null,
        ipAddress,
        session_id || null,
        is_skipped !== undefined ? is_skipped : 0,
        watched_seconds || 0,
      ]
    );

    const debitResult = await debitWalletForAdSpend({
      creatorUserId: campaign.creator_user_id,
      amount: debitAmount,
      reference: `ad_view_${campaign_id}_${result.insertId}_${crypto.randomUUID()}`,
      description: `Ad view charge for campaign ${campaign.title || campaign.id}`,
      metadata: {
        campaign_id: Number(campaign_id),
        ad_video_id: Number(ad_video_id),
        viewer_video_id: viewer_video_id || null,
        impression_id: result.insertId,
        charge_type: 'view',
        session_id: session_id || null,
      },
    });

    if (!debitResult.success) {
      await pauseCampaignForWallet(campaign_id);

      return res.status(200).json({
        message: 'Ad impression tracked but campaign paused due to insufficient wallet balance',
        impression_id: result.insertId,
        campaign_paused: true,
      });
    }

    if (Number(debitResult.wallet?.balance || 0) <= 0) {
      await pauseCampaignForWallet(campaign_id);
    }

    const hostVideoOwner = await getEligibleHostVideoOwner(viewer_video_id);
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
        }
      : {
          ...baseSplit,
          creator_share_amount: 0,
          platform_share_amount: roundMoney(debitAmount),
          host_video_owner_creator_id: null,
          host_video_owner_user_id: null,
          host_video_owner_public_name: null,
          host_video_id: viewer_video_id || null,
          host_video_title: null,
          creator_share_reserved: false,
          note: 'No eligible monetized host creator found for this viewer video',
        };

    const [impressions] = await pool.query(
      'SELECT * FROM ad_impressions WHERE id = ? LIMIT 1',
      [result.insertId]
    );

    return res.status(201).json({
      message: 'Ad impression tracked successfully',
      impression_id: result.insertId,
      charged_amount: debitAmount,
      wallet_balance: debitResult.wallet?.balance || 0,
      campaign_paused: Number(debitResult.wallet?.balance || 0) <= 0,
      daily_spend_today: roundMoney(dailySpendToday + debitAmount),
      daily_budget_cap: dailyBudgetCap,
      revenue_allocation: revenueAllocation,
      impression: impressions[0] || {
        id: result.insertId,
        campaign_id,
        ad_video_id,
        viewer_video_id: viewer_video_id || null,
        ip_address: ipAddress,
        session_id: session_id || null,
        is_skipped: is_skipped !== undefined ? is_skipped : 0,
        watched_seconds: watched_seconds || 0,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to track ad impression',
      error: error.message,
    });
  }
}

module.exports = {
  trackAdImpression,
  calculateRevenueSplit,
  getEligibleHostVideoOwner,
};