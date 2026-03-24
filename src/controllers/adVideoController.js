const pool = require('../config/db');

async function createAdVideo(req, res) {
  try {
    const {
      campaign_id,
      title,
      video_key,
      thumbnail_key,
      duration_seconds,
    } = req.body;

    if (!campaign_id || !title) {
      return res.status(400).json({
        message: 'campaign_id and title are required',
      });
    }

    const [campaigns] = await pool.query(
      'SELECT * FROM ad_campaigns WHERE id = ? LIMIT 1',
      [campaign_id]
    );

    if (!campaigns.length) {
      return res.status(404).json({
        message: 'Ad campaign not found',
      });
    }

    const [result] = await pool.query(
      `INSERT INTO ad_videos
      (
        campaign_id,
        title,
        video_key,
        thumbnail_key,
        duration_seconds,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        campaign_id,
        title.trim(),
        video_key || null,
        thumbnail_key || null,
        duration_seconds || 0,
        'pending',
      ]
    );

    const [adVideos] = await pool.query(
      'SELECT * FROM ad_videos WHERE id = ? LIMIT 1',
      [result.insertId]
    );

    return res.status(201).json({
      message: 'Ad video created successfully',
      ad_video: adVideos[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to create ad video',
      error: error.message,
    });
  }
}

module.exports = {
  createAdVideo,
};