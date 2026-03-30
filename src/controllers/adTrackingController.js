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
      `SELECT id, creator_user_id, title, status, cost_per_view
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

    const campaign = campaignRows[0];

    if (campaign.status !== 'active') {
      return res.status(400).json({
        message: 'Ad campaign is not active',
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

    const debitAmount = roundMoney(campaign.cost_per_view || 0);

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
};