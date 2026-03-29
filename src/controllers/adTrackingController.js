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

    const [impressions] = await pool.query(
      'SELECT * FROM ad_impressions WHERE id = ? LIMIT 1',
      [result.insertId]
    );

    return res.status(201).json({
      message: 'Ad impression tracked successfully',
      impression_id: result.insertId,
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