const pool = require('../config/db');

async function upsertMyViewerProfile(req, res) {
  try {
    const userId = req.user.id;
    const { display_name } = req.body;

    if (!display_name || !String(display_name).trim()) {
      return res.status(400).json({
        message: 'display_name is required',
      });
    }

    const cleanDisplayName = String(display_name).trim();

    const [existingRows] = await pool.query(
      'SELECT * FROM viewer_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (!existingRows.length) {
      await pool.query(
        'INSERT INTO viewer_profiles (user_id, display_name) VALUES (?, ?)',
        [userId, cleanDisplayName]
      );
    } else {
      await pool.query(
        'UPDATE viewer_profiles SET display_name = ? WHERE user_id = ?',
        [cleanDisplayName, userId]
      );
    }

    const [rows] = await pool.query(
      'SELECT * FROM viewer_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );

    return res.status(200).json({
      message: 'Viewer profile saved successfully',
      viewer_profile: rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to save viewer profile',
      error: error.message,
    });
  }
}

async function getMyViewerProfile(req, res) {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      'SELECT * FROM viewer_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: 'Viewer profile not found',
      });
    }

    return res.status(200).json({
      viewer_profile: rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch viewer profile',
      error: error.message,
    });
  }
}

module.exports = {
  upsertMyViewerProfile,
  getMyViewerProfile,
};