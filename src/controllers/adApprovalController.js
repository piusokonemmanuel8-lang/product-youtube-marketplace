const pool = require('../config/db');

async function approveAdVideo(req, res) {
  try {
    const { id } = req.params;

    const [adVideos] = await pool.query(
      'SELECT * FROM ad_videos WHERE id = ? LIMIT 1',
      [id]
    );

    if (!adVideos.length) {
      return res.status(404).json({
        message: 'Ad video not found',
      });
    }

    await pool.query(
      `UPDATE ad_videos
       SET status = 'approved'
       WHERE id = ?`,
      [id]
    );

    const [updatedAdVideos] = await pool.query(
      'SELECT * FROM ad_videos WHERE id = ? LIMIT 1',
      [id]
    );

    return res.status(200).json({
      message: 'Ad video approved successfully',
      ad_video: updatedAdVideos[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to approve ad video',
      error: error.message,
    });
  }
}

module.exports = {
  approveAdVideo,
};