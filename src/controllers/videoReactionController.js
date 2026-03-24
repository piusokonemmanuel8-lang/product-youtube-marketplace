const pool = require('../config/db');

async function reactToVideo(req, res) {
  try {
    const userId = req.user.id;
    const { videoId } = req.params;
    const { reaction_type } = req.body;

    if (!['like', 'dislike'].includes(reaction_type)) {
      return res.status(400).json({
        message: 'reaction_type must be like or dislike',
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

    const [existingReactions] = await pool.query(
      'SELECT * FROM video_reactions WHERE video_id = ? AND user_id = ? LIMIT 1',
      [videoId, userId]
    );

    if (!existingReactions.length) {
      await pool.query(
        'INSERT INTO video_reactions (video_id, user_id, reaction_type) VALUES (?, ?, ?)',
        [videoId, userId, reaction_type]
      );

      return res.status(201).json({
        message: `Video ${reaction_type}d successfully`,
      });
    }

    const existingReaction = existingReactions[0];

    if (existingReaction.reaction_type === reaction_type) {
      await pool.query(
        'DELETE FROM video_reactions WHERE id = ?',
        [existingReaction.id]
      );

      return res.status(200).json({
        message: `${reaction_type} removed successfully`,
      });
    }

    await pool.query(
      'UPDATE video_reactions SET reaction_type = ? WHERE id = ?',
      [reaction_type, existingReaction.id]
    );

    return res.status(200).json({
      message: `Reaction changed to ${reaction_type} successfully`,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to react to video',
      error: error.message,
    });
  }
}

async function removeVideoReaction(req, res) {
  try {
    const userId = req.user.id;
    const { videoId } = req.params;

    const [existingReactions] = await pool.query(
      'SELECT * FROM video_reactions WHERE video_id = ? AND user_id = ? LIMIT 1',
      [videoId, userId]
    );

    if (!existingReactions.length) {
      return res.status(404).json({
        message: 'Reaction not found',
      });
    }

    await pool.query(
      'DELETE FROM video_reactions WHERE id = ?',
      [existingReactions[0].id]
    );

    return res.status(200).json({
      message: 'Reaction removed successfully',
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to remove reaction',
      error: error.message,
    });
  }
}

async function getVideoReactionSummary(req, res) {
  try {
    const userId = req.user ? req.user.id : null;
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

    const [likeRows] = await pool.query(
      "SELECT COUNT(*) AS count FROM video_reactions WHERE video_id = ? AND reaction_type = 'like'",
      [videoId]
    );

    const [dislikeRows] = await pool.query(
      "SELECT COUNT(*) AS count FROM video_reactions WHERE video_id = ? AND reaction_type = 'dislike'",
      [videoId]
    );

    let userReaction = null;

    if (userId) {
      const [userReactionRows] = await pool.query(
        'SELECT reaction_type FROM video_reactions WHERE video_id = ? AND user_id = ? LIMIT 1',
        [videoId, userId]
      );

      if (userReactionRows.length) {
        userReaction = userReactionRows[0].reaction_type;
      }
    }

    return res.status(200).json({
      video_id: Number(videoId),
      likes_count: likeRows[0].count,
      dislikes_count: dislikeRows[0].count,
      user_reaction: userReaction,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch reaction summary',
      error: error.message,
    });
  }
}

module.exports = {
  reactToVideo,
  removeVideoReaction,
  getVideoReactionSummary,
};