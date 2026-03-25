const pool = require('../config/db');

async function createCreatorProfile(req, res) {
  try {
    const userId = req.user.id;

    const [existingProfiles] = await pool.query(
      'SELECT * FROM creator_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (existingProfiles.length) {
      return res.status(200).json({
        message: 'Creator profile already exists',
        creator_profile: existingProfiles[0],
      });
    }

    const [result] = await pool.query(
      'INSERT INTO creator_profiles (user_id) VALUES (?)',
      [userId]
    );

    const [profiles] = await pool.query(
      'SELECT * FROM creator_profiles WHERE id = ? LIMIT 1',
      [result.insertId]
    );

    return res.status(201).json({
      message: 'Creator profile created successfully',
      creator_profile: profiles[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to create creator profile',
      error: error.message,
    });
  }
}

async function getMyCreatorProfile(req, res) {
  try {
    const userId = req.user.id;

    const [profiles] = await pool.query(
      'SELECT * FROM creator_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (!profiles.length) {
      return res.status(404).json({
        message: 'Creator profile not found',
      });
    }

    return res.status(200).json({
      creator_profile: profiles[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch creator profile',
      error: error.message,
    });
  }
}

module.exports = {
  createCreatorProfile,
  getMyCreatorProfile,
};