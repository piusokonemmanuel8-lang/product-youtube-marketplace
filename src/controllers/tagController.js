const pool = require('../config/db');

function slugifyTag(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function createTag(req, res) {
  try {
    const { name } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        message: 'name is required',
      });
    }

    const cleanName = String(name).trim();
    const slug = slugifyTag(cleanName);

    if (!slug) {
      return res.status(400).json({
        message: 'Invalid tag name',
      });
    }

    const [existingRows] = await pool.query(
      'SELECT * FROM tags WHERE name = ? OR slug = ? LIMIT 1',
      [cleanName, slug]
    );

    if (existingRows.length) {
      return res.status(200).json({
        message: 'Tag already exists',
        tag: existingRows[0],
      });
    }

    const [result] = await pool.query(
      'INSERT INTO tags (name, slug) VALUES (?, ?)',
      [cleanName, slug]
    );

    const [rows] = await pool.query(
      'SELECT * FROM tags WHERE id = ? LIMIT 1',
      [result.insertId]
    );

    return res.status(201).json({
      message: 'Tag created successfully',
      tag: rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to create tag',
      error: error.message,
    });
  }
}

async function getAllTags(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM tags ORDER BY id DESC'
    );

    return res.status(200).json({
      tags: rows,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch tags',
      error: error.message,
    });
  }
}

async function attachTagsToMyVideo(req, res) {
  try {
    const userId = req.user.id;
    const { videoId } = req.params;
    const { tag_ids } = req.body;

    if (!Array.isArray(tag_ids) || !tag_ids.length) {
      return res.status(400).json({
        message: 'tag_ids must be a non-empty array',
      });
    }

    const [creatorProfiles] = await pool.query(
      'SELECT id FROM creator_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (!creatorProfiles.length) {
      return res.status(404).json({
        message: 'Creator profile not found',
      });
    }

    const creatorId = creatorProfiles[0].id;

    const [videos] = await pool.query(
      'SELECT id FROM videos WHERE id = ? AND creator_id = ? LIMIT 1',
      [videoId, creatorId]
    );

    if (!videos.length) {
      return res.status(404).json({
        message: 'Video not found',
      });
    }

    const numericTagIds = [...new Set(tag_ids.map((id) => Number(id)).filter((id) => !Number.isNaN(id)))];

    if (!numericTagIds.length) {
      return res.status(400).json({
        message: 'No valid tag ids provided',
      });
    }

    const [tagRows] = await pool.query(
      'SELECT id FROM tags WHERE id IN (?)',
      [numericTagIds]
    );

    const foundTagIds = tagRows.map((row) => row.id);

    if (!foundTagIds.length) {
      return res.status(404).json({
        message: 'No matching tags found',
      });
    }

    for (const tagId of foundTagIds) {
      await pool.query(
        `INSERT INTO video_tags (video_id, tag_id)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE tag_id = VALUES(tag_id)`,
        [videoId, tagId]
      );
    }

    const [rows] = await pool.query(
      `SELECT t.*
       FROM video_tags vt
       INNER JOIN tags t ON t.id = vt.tag_id
       WHERE vt.video_id = ?
       ORDER BY t.id DESC`,
      [videoId]
    );

    return res.status(200).json({
      message: 'Tags attached to video successfully',
      tags: rows,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to attach tags to video',
      error: error.message,
    });
  }
}

async function getVideoTags(req, res) {
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

    const [rows] = await pool.query(
      `SELECT t.*
       FROM video_tags vt
       INNER JOIN tags t ON t.id = vt.tag_id
       WHERE vt.video_id = ?
       ORDER BY t.id DESC`,
      [videoId]
    );

    return res.status(200).json({
      tags: rows,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch video tags',
      error: error.message,
    });
  }
}

module.exports = {
  createTag,
  getAllTags,
  attachTagsToMyVideo,
  getVideoTags,
};