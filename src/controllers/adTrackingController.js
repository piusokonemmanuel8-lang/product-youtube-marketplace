const pool = require('../config/db');

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

    return res.status(201).json({
      message: 'Ad impression tracked successfully',
      impression_id: result.insertId,
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