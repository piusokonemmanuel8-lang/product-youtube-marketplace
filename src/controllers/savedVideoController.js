const pool = require('../config/db');

async function saveVideo(req, res) {
  try {
    const userId = req.user.id;
    const { videoId } = req.params;

    const [videos] = await pool.query(
      'SELECT id FROM videos WHERE id = ? LIMIT 1',
      [videoId]
    );

    if (!videos.length) {
      return res.status(404).json({
        message: 'Video not found',
      });
    }

    const [existingRows] = await pool.query(
      'SELECT id FROM saved_videos WHERE user_id = ? AND video_id = ? LIMIT 1',
      [userId, videoId]
    );

    if (existingRows.length) {
      return res.status(200).json({
        message: 'Video already saved',
      });
    }

    await pool.query(
      'INSERT INTO saved_videos (user_id, video_id) VALUES (?, ?)',
      [userId, videoId]
    );

    return res.status(201).json({
      message: 'Video saved successfully',
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to save video',
      error: error.message,
    });
  }
}

async function unsaveVideo(req, res) {
  try {
    const userId = req.user.id;
    const { videoId } = req.params;

    const [existingRows] = await pool.query(
      'SELECT id FROM saved_videos WHERE user_id = ? AND video_id = ? LIMIT 1',
      [userId, videoId]
    );

    if (!existingRows.length) {
      return res.status(404).json({
        message: 'Saved video not found',
      });
    }

    await pool.query(
      'DELETE FROM saved_videos WHERE id = ?',
      [existingRows[0].id]
    );

    return res.status(200).json({
      message: 'Video removed from saved list successfully',
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to remove saved video',
      error: error.message,
    });
  }
}

async function getMySavedVideos(req, res) {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT sv.*, v.title, v.slug, v.thumbnail_key
       FROM saved_videos sv
       INNER JOIN videos v ON v.id = sv.video_id
       WHERE sv.user_id = ?
       ORDER BY sv.created_at DESC`,
      [userId]
    );

    return res.status(200).json({
      saved_videos: rows,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch saved videos',
      error: error.message,
    });
  }
}

async function getMySavedVideoStatus(req, res) {
  try {
    const userId = req.user.id;
    const { videoId } = req.params;

    const [rows] = await pool.query(
      'SELECT id FROM saved_videos WHERE user_id = ? AND video_id = ? LIMIT 1',
      [userId, videoId]
    );

    return res.status(200).json({
      video_id: Number(videoId),
      is_saved: rows.length > 0,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch saved video status',
      error: error.message,
    });
  }
}

module.exports = {
  saveVideo,
  unsaveVideo,
  getMySavedVideos,
  getMySavedVideoStatus,
};