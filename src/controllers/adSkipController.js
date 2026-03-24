const pool = require('../config/db');

async function trackAdSkip(req, res) {
  try {
    const { impression_id, watched_seconds } = req.body;

    if (!impression_id) {
      return res.status(400).json({
        message: 'impression_id is required',
      });
    }

    const [impressions] = await pool.query(
      'SELECT * FROM ad_impressions WHERE id = ? LIMIT 1',
      [impression_id]
    );

    if (!impressions.length) {
      return res.status(404).json({
        message: 'Ad impression not found',
      });
    }

    await pool.query(
      `UPDATE ad_impressions
       SET is_skipped = 1,
           watched_seconds = ?
       WHERE id = ?`,
      [
        watched_seconds || impressions[0].watched_seconds || 0,
        impression_id,
      ]
    );

    const [updatedImpressions] = await pool.query(
      'SELECT * FROM ad_impressions WHERE id = ? LIMIT 1',
      [impression_id]
    );

    return res.status(200).json({
      message: 'Ad skip tracked successfully',
      impression: updatedImpressions[0],
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
};