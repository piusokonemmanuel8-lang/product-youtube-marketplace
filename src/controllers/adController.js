const crypto = require('crypto');
const pool = require('../config/db');

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

    const campaignUuid = crypto.randomUUID();

    const [result] = await pool.query(
      `INSERT INTO ad_campaigns
      (
        uuid,
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        campaignUuid,
        advertiser_name.trim(),
        advertiser_email || null,
        title.trim(),
        destination_url.trim(),
        budget || 0,
        cost_per_view || 0,
        cost_per_click || 0,
        max_impressions || 0,
        max_clicks || 0,
        skip_after_seconds || 3,
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

module.exports = {
  createAdCampaign,
  approveAdCampaign,
};