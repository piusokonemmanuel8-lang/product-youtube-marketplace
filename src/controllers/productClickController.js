const pool = require('../config/db');

async function recordProductClick(req, res) {
  console.log('HIT recordProductClick', req.params, req.body);

  try {
    const userId = req.user ? req.user.id : null;
    const { videoId } = req.params;
    const { destination_url } = req.body || {};

    const [videos] = await pool.query(
      `SELECT id, creator_id, buy_now_url
       FROM videos
       WHERE id = ?
       LIMIT 1`,
      [videoId]
    );

    if (!videos.length) {
      return res.status(404).json({
        message: 'Video not found',
      });
    }

    const video = videos[0];
    const finalDestinationUrl = destination_url || video.buy_now_url || null;

    await pool.query(
      `INSERT INTO product_clicks (video_id, creator_id, user_id, destination_url, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [video.id, video.creator_id, userId, finalDestinationUrl]
    );

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total_clicks
       FROM product_clicks
       WHERE creator_id = ?`,
      [video.creator_id]
    );

    return res.status(201).json({
      message: 'Product click recorded successfully',
      video_id: Number(video.id),
      total_clicks: Number(countRows[0]?.total_clicks || 0),
    });
  } catch (error) {
    console.error('recordProductClick error:', error);

    return res.status(500).json({
      message: 'Failed to record product click',
      error: error.message,
    });
  }
}

module.exports = {
  recordProductClick,
};