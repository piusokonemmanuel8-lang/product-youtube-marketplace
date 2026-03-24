const pool = require('../config/db');

async function upsertWatchHistory(req, res) {
  try {
    const userId = req.user.id;
    const { videoId } = req.params;
    const { watch_seconds, progress_percent, completed } = req.body;

    const [videos] = await pool.query(
      'SELECT id FROM videos WHERE id = ? LIMIT 1',
      [videoId]
    );

    if (!videos.length) {
      return res.status(404).json({
        message: 'Video not found',
      });
    }

    const finalWatchSeconds =
      watch_seconds !== undefined ? Number(watch_seconds) : 0;

    const finalProgressPercent =
      progress_percent !== undefined ? Number(progress_percent) : 0;

    const finalCompleted =
      completed !== undefined ? Number(completed) : 0;

    if (Number.isNaN(finalWatchSeconds) || finalWatchSeconds < 0) {
      return res.status(400).json({
        message: 'watch_seconds must be a valid non-negative number',
      });
    }

    if (
      Number.isNaN(finalProgressPercent) ||
      finalProgressPercent < 0 ||
      finalProgressPercent > 100
    ) {
      return res.status(400).json({
        message: 'progress_percent must be between 0 and 100',
      });
    }

    if (![0, 1].includes(finalCompleted)) {
      return res.status(400).json({
        message: 'completed must be 0 or 1',
      });
    }

    const [existingRows] = await pool.query(
      'SELECT * FROM watch_history WHERE user_id = ? AND video_id = ? LIMIT 1',
      [userId, videoId]
    );

    if (!existingRows.length) {
      await pool.query(
        `INSERT INTO watch_history
        (user_id, video_id, watch_seconds, progress_percent, completed, last_watched_at)
        VALUES (?, ?, ?, ?, ?, NOW())`,
        [userId, videoId, finalWatchSeconds, finalProgressPercent, finalCompleted]
      );
    } else {
      await pool.query(
        `UPDATE watch_history
         SET watch_seconds = ?, progress_percent = ?, completed = ?, last_watched_at = NOW()
         WHERE user_id = ? AND video_id = ?`,
        [finalWatchSeconds, finalProgressPercent, finalCompleted, userId, videoId]
      );
    }

    const [rows] = await pool.query(
      'SELECT * FROM watch_history WHERE user_id = ? AND video_id = ? LIMIT 1',
      [userId, videoId]
    );

    return res.status(200).json({
      message: 'Watch history saved successfully',
      watch_history: rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to save watch history',
      error: error.message,
    });
  }
}

async function getMyWatchHistory(req, res) {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT wh.*, v.title, v.slug, v.thumbnail_key
       FROM watch_history wh
       INNER JOIN videos v ON v.id = wh.video_id
       WHERE wh.user_id = ?
       ORDER BY wh.last_watched_at DESC`,
      [userId]
    );

    return res.status(200).json({
      watch_history: rows,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch watch history',
      error: error.message,
    });
  }
}

async function getMyVideoWatchHistory(req, res) {
  try {
    const userId = req.user.id;
    const { videoId } = req.params;

    const [rows] = await pool.query(
      'SELECT * FROM watch_history WHERE user_id = ? AND video_id = ? LIMIT 1',
      [userId, videoId]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: 'Watch history not found',
      });
    }

    return res.status(200).json({
      watch_history: rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch video watch history',
      error: error.message,
    });
  }
}

async function deleteMyVideoWatchHistory(req, res) {
  try {
    const userId = req.user.id;
    const { videoId } = req.params;

    const [rows] = await pool.query(
      'SELECT id FROM watch_history WHERE user_id = ? AND video_id = ? LIMIT 1',
      [userId, videoId]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: 'Watch history not found',
      });
    }

    await pool.query(
      'DELETE FROM watch_history WHERE id = ?',
      [rows[0].id]
    );

    return res.status(200).json({
      message: 'Watch history deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to delete watch history',
      error: error.message,
    });
  }
}

module.exports = {
  upsertWatchHistory,
  getMyWatchHistory,
  getMyVideoWatchHistory,
  deleteMyVideoWatchHistory,
};