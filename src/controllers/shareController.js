const pool = require('../config/db');

async function recordVideoShare(req, res) {
  try {
    const userId = req.user ? req.user.id : null;
    const { videoId } = req.params;
    const { share_type } = req.body;

    const allowedShareTypes = [
      'copy_link',
      'facebook',
      'twitter',
      'whatsapp',
      'telegram',
      'email',
      'other',
    ];

    if (!allowedShareTypes.includes(share_type)) {
      return res.status(400).json({
        message: 'share_type is invalid',
      });
    }

    const [videos] = await pool.query(
      'SELECT id FROM videos WHERE id = ? LIMIT 1',
      [videoId]
    );

    if (!videos.length) {
      return res.status(404).json({
        message: 'Video not found',
      });
    }

    const [result] = await pool.query(
      `INSERT INTO video_shares (video_id, user_id, share_type)
       VALUES (?, ?, ?)`,
      [videoId, userId, share_type]
    );

    const [rows] = await pool.query(
      'SELECT * FROM video_shares WHERE id = ? LIMIT 1',
      [result.insertId]
    );

    return res.status(201).json({
      message: 'Video share recorded successfully',
      share: rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to record video share',
      error: error.message,
    });
  }
}

async function getVideoShareSummary(req, res) {
  try {
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

    const [totalRows] = await pool.query(
      `SELECT COUNT(*) AS total_shares
       FROM video_shares
       WHERE video_id = ?`,
      [videoId]
    );

    const [typeRows] = await pool.query(
      `SELECT share_type, COUNT(*) AS total
       FROM video_shares
       WHERE video_id = ?
       GROUP BY share_type
       ORDER BY total DESC`,
      [videoId]
    );

    return res.status(200).json({
      video_id: Number(videoId),
      total_shares: Number(totalRows[0].total_shares || 0),
      by_type: typeRows.map((row) => ({
        share_type: row.share_type,
        total: Number(row.total),
      })),
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch video share summary',
      error: error.message,
    });
  }
}

async function getMyShares(req, res) {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT vs.*, v.title, v.slug
       FROM video_shares vs
       INNER JOIN videos v ON v.id = vs.video_id
       WHERE vs.user_id = ?
       ORDER BY vs.id DESC`,
      [userId]
    );

    return res.status(200).json({
      shares: rows,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch my shares',
      error: error.message,
    });
  }
}

module.exports = {
  recordVideoShare,
  getVideoShareSummary,
  getMyShares,
};