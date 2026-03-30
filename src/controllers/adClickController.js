const crypto = require('crypto');
const pool = require('../config/db');
const { debitWalletForAdSpend } = require('./walletController');

function roundMoney(value) {
  return Number((Number(value || 0)).toFixed(4));
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
    `SELECT id, creator_user_id, title, status, cost_per_click, budget, pause_reason, pause_notice, paused_at
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

  return roundMoney(Number(impressionRows[0]?.total || 0) + Number(clickRows[0]?.total || 0));
}

async function trackAdClick(req, res) {
  try {
    const {
      campaign_id,
      ad_video_id,
      viewer_video_id,
      session_id,
    } = req.body;

    if (!campaign_id || !ad_video_id) {
      return res.status(400).json({
        message: 'campaign_id and ad_video_id are required',
      });
    }

    const ipAddress =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      null;

    const [campaignRows] = await pool.query(
      `SELECT id, creator_user_id, title, status, cost_per_click, budget, pause_reason, pause_notice, paused_at
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

    const debitAmount = roundMoney(campaign.cost_per_click || 0.02);
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

    const [result] = await pool.query(
      `INSERT INTO ad_clicks
      (
        campaign_id,
        ad_video_id,
        viewer_video_id,
        ip_address,
        session_id
      )
      VALUES (?, ?, ?, ?, ?)`,
      [
        campaign_id,
        ad_video_id,
        viewer_video_id || null,
        ipAddress,
        session_id || null,
      ]
    );

    const debitResult = await debitWalletForAdSpend({
      creatorUserId: campaign.creator_user_id,
      amount: debitAmount,
      reference: `ad_click_${campaign_id}_${result.insertId}_${crypto.randomUUID()}`,
      description: `Ad click charge for campaign ${campaign.title || campaign.id}`,
      metadata: {
        campaign_id: Number(campaign_id),
        ad_video_id: Number(ad_video_id),
        viewer_video_id: viewer_video_id || null,
        click_id: result.insertId,
        charge_type: 'click',
      },
    });

    if (!debitResult.success) {
      await pauseCampaignForWallet(campaign_id);

      return res.status(200).json({
        message: 'Ad click tracked but campaign paused due to insufficient wallet balance',
        click_id: result.insertId,
        campaign_paused: true,
      });
    }

    if (Number(debitResult.wallet?.balance || 0) <= 0) {
      await pauseCampaignForWallet(campaign_id);
    }

    return res.status(201).json({
      message: 'Ad click tracked successfully',
      click_id: result.insertId,
      charged_amount: debitAmount,
      wallet_balance: debitResult.wallet?.balance || 0,
      campaign_paused: Number(debitResult.wallet?.balance || 0) <= 0,
      daily_spend_today: roundMoney(dailySpendToday + debitAmount),
      daily_budget_cap: dailyBudgetCap,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to track ad click',
      error: error.message,
    });
  }
}

module.exports = {
  trackAdClick,
};