const crypto = require('crypto');
const pool = require('../config/db');

function normalizeSkipAfterSeconds(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 3) {
    return 10;
  }

  return Math.floor(parsed);
}

async function createAdCampaign(req, res) {
  try {
    const {
      advertiser_name,
      advertiser_email,
      title,
      destination_url,
      budget,
      cost_per_view,
      cost_per_click,
      max_impressions,
      max_clicks,
      skip_after_seconds,
      starts_at,
      ends_at,
    } = req.body;

    if (!advertiser_name || !title || !destination_url) {
      return res.status(400).json({
        message: 'advertiser_name, title and destination_url are required',
      });
    }

    const creatorUserId = Number(req.user?.id || 0);

    if (!creatorUserId) {
      return res.status(401).json({
        message: 'Authenticated creator user is required',
      });
    }

    const campaignUuid = crypto.randomUUID();
    const finalSkipAfterSeconds = normalizeSkipAfterSeconds(skip_after_seconds);

    const [result] = await pool.query(
      `INSERT INTO ad_campaigns
      (
        uuid,
        creator_user_id,
        advertiser_name,
        advertiser_email,
        title,
        destination_url,
        budget,
        cost_per_view,
        cost_per_click,
        max_impressions,
        max_clicks,
        skip_after_seconds,
        status,
        starts_at,
        ends_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        campaignUuid,
        creatorUserId,
        advertiser_name.trim(),
        advertiser_email || null,
        title.trim(),
        destination_url.trim(),
        budget || 0,
        cost_per_view || 0,
        cost_per_click || 0,
        max_impressions || 0,
        max_clicks || 0,
        finalSkipAfterSeconds,
        'draft',
        starts_at || null,
        ends_at || null,
      ]
    );

    const [campaigns] = await pool.query(
      'SELECT * FROM ad_campaigns WHERE id = ? LIMIT 1',
      [result.insertId]
    );

    return res.status(201).json({
      message: 'Ad campaign created successfully',
      campaign: campaigns[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to create ad campaign',
      error: error.message,
    });
  }
}

async function approveAdCampaign(req, res) {
  try {
    const { id } = req.params;

    const [campaigns] = await pool.query(
      'SELECT * FROM ad_campaigns WHERE id = ? LIMIT 1',
      [id]
    );

    if (!campaigns.length) {
      return res.status(404).json({
        message: 'Ad campaign not found',
      });
    }

    await pool.query(
      `UPDATE ad_campaigns
       SET status = 'active'
       WHERE id = ?`,
      [id]
    );

    const [updatedCampaigns] = await pool.query(
      'SELECT * FROM ad_campaigns WHERE id = ? LIMIT 1',
      [id]
    );

    return res.status(200).json({
      message: 'Ad campaign approved successfully',
      campaign: updatedCampaigns[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to approve ad campaign',
      error: error.message,
    });
  }
}

async function pauseAdCampaign(req, res) {
  try {
    const { id } = req.params;

    const [campaigns] = await pool.query(
      'SELECT * FROM ad_campaigns WHERE id = ? LIMIT 1',
      [id]
    );

    if (!campaigns.length) {
      return res.status(404).json({
        message: 'Ad campaign not found',
      });
    }

    await pool.query(
      `UPDATE ad_campaigns
       SET status = 'paused'
       WHERE id = ?`,
      [id]
    );

    const [updatedCampaigns] = await pool.query(
      'SELECT * FROM ad_campaigns WHERE id = ? LIMIT 1',
      [id]
    );

    return res.status(200).json({
      message: 'Ad campaign paused successfully',
      campaign: updatedCampaigns[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to pause ad campaign',
      error: error.message,
    });
  }
}

async function deleteAdCampaign(req, res) {
  try {
    const { id } = req.params;

    const [campaigns] = await pool.query(
      'SELECT * FROM ad_campaigns WHERE id = ? LIMIT 1',
      [id]
    );

    if (!campaigns.length) {
      return res.status(404).json({
        message: 'Ad campaign not found',
      });
    }

    await pool.query('DELETE FROM ad_videos WHERE campaign_id = ?', [id]);
    await pool.query('DELETE FROM ad_campaigns WHERE id = ?', [id]);

    return res.status(200).json({
      message: 'Ad campaign deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to delete ad campaign',
      error: error.message,
    });
  }
}

async function getAllAdCampaigns(req, res) {
  try {
    const [campaigns] = await pool.query(
      `SELECT *
       FROM ad_campaigns
       ORDER BY id DESC`
    );

    return res.status(200).json({
      campaigns,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch ad campaigns',
      error: error.message,
    });
  }
}

async function getPendingAdCampaigns(req, res) {
  try {
    const [campaigns] = await pool.query(
      `SELECT *
       FROM ad_campaigns
       WHERE status IN ('draft', 'pending')
       ORDER BY id DESC`
    );

    return res.status(200).json({
      campaigns,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch pending ad campaigns',
      error: error.message,
    });
  }
}

async function getMyAdCampaigns(req, res) {
  try {
    const creatorUserId = Number(req.user?.id || 0);

    if (!creatorUserId) {
      return res.status(401).json({
        message: 'Authenticated creator user is required',
      });
    }

    const [campaigns] = await pool.query(
      `SELECT
        ac.*,
        COUNT(DISTINCT av.id) AS total_ad_videos
       FROM ad_campaigns ac
       LEFT JOIN ad_videos av ON av.campaign_id = ac.id
       WHERE ac.creator_user_id = ?
       GROUP BY ac.id
       ORDER BY ac.id DESC`,
      [creatorUserId]
    );

    return res.status(200).json({
      campaigns,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch my ad campaigns',
      error: error.message,
    });
  }
}

module.exports = {
  createAdCampaign,
  approveAdCampaign,
  pauseAdCampaign,
  deleteAdCampaign,
  getAllAdCampaigns,
  getPendingAdCampaigns,
  getMyAdCampaigns,
};