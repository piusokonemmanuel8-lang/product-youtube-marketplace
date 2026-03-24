const pool = require('../config/db');

async function getCampaignStats(req, res) {
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

    const [impressions] = await pool.query(
      `SELECT COUNT(*) AS total_impressions
       FROM ad_impressions
       WHERE campaign_id = ?`,
      [id]
    );

    const [clicks] = await pool.query(
      `SELECT COUNT(*) AS total_clicks
       FROM ad_clicks
       WHERE campaign_id = ?`,
      [id]
    );

    const [skips] = await pool.query(
      `SELECT COUNT(*) AS total_skips
       FROM ad_impressions
       WHERE campaign_id = ? AND is_skipped = 1`,
      [id]
    );

    return res.status(200).json({
      campaign: campaigns[0],
      stats: {
        total_impressions: impressions[0].total_impressions,
        total_clicks: clicks[0].total_clicks,
        total_skips: skips[0].total_skips,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch campaign stats',
      error: error.message,
    });
  }
}

module.exports = {
  getCampaignStats,
};