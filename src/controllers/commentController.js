const pool = require('../config/db');

async function createComment(req, res) {
  try {
    const userId = req.user.id;
    const { videoId } = req.params;
    const { comment_text, parent_id } = req.body;

    if (!comment_text || !String(comment_text).trim()) {
      return res.status(400).json({
        message: 'comment_text is required',
      });
    }

    const cleanText = String(comment_text).trim();

    const [videos] = await pool.query(
      'SELECT id, comments_enabled FROM videos WHERE id = ? LIMIT 1',
      [videoId]
    );

    if (!videos.length) {
      return res.status(404).json({
        message: 'Video not found',
      });
    }

    if (Number(videos[0].comments_enabled) !== 1) {
      return res.status(400).json({
        message: 'Comments are disabled for this video',
      });
    }

    let finalParentId = null;

    if (parent_id !== undefined && parent_id !== null) {
      const [parentComments] = await pool.query(
        'SELECT id, video_id, status FROM comments WHERE id = ? LIMIT 1',
        [parent_id]
      );

      if (!parentComments.length) {
        return res.status(404).json({
          message: 'Parent comment not found',
        });
      }

      const parentComment = parentComments[0];

      if (Number(parentComment.video_id) !== Number(videoId)) {
        return res.status(400).json({
          message: 'Parent comment does not belong to this video',
        });
      }

      if (parentComment.status !== 'active') {
        return res.status(400).json({
          message: 'You can only reply to an active comment',
        });
      }

      finalParentId = parentComment.id;
    }

    const [result] = await pool.query(
      `INSERT INTO comments
      (video_id, user_id, parent_id, comment_text, like_count, reply_count, status)
      VALUES (?, ?, ?, ?, 0, 0, 'active')`,
      [videoId, userId, finalParentId, cleanText]
    );

    if (finalParentId) {
      await pool.query(
        'UPDATE comments SET reply_count = reply_count + 1 WHERE id = ?',
        [finalParentId]
      );
    }

    const [comments] = await pool.query(
      'SELECT * FROM comments WHERE id = ? LIMIT 1',
      [result.insertId]
    );

    return res.status(201).json({
      message: 'Comment created successfully',
      comment: comments[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to create comment',
      error: error.message,
    });
  }
}

async function getVideoComments(req, res) {
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

    const [comments] = await pool.query(
      `SELECT *
       FROM comments
       WHERE video_id = ? AND status = 'active'
       ORDER BY created_at DESC`,
      [videoId]
    );

    return res.status(200).json({
      comments,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch comments',
      error: error.message,
    });
  }
}

async function updateMyComment(req, res) {
  try {
    const userId = req.user.id;
    const { commentId } = req.params;
    const { comment_text } = req.body;

    if (!comment_text || !String(comment_text).trim()) {
      return res.status(400).json({
        message: 'comment_text is required',
      });
    }

    const cleanText = String(comment_text).trim();

    const [comments] = await pool.query(
      'SELECT * FROM comments WHERE id = ? AND user_id = ? LIMIT 1',
      [commentId, userId]
    );

    if (!comments.length) {
      return res.status(404).json({
        message: 'Comment not found',
      });
    }

    const currentComment = comments[0];

    if (currentComment.status !== 'active') {
      return res.status(400).json({
        message: 'Only active comments can be updated',
      });
    }

    await pool.query(
      'UPDATE comments SET comment_text = ? WHERE id = ?',
      [cleanText, commentId]
    );

    const [updatedComments] = await pool.query(
      'SELECT * FROM comments WHERE id = ? LIMIT 1',
      [commentId]
    );

    return res.status(200).json({
      message: 'Comment updated successfully',
      comment: updatedComments[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to update comment',
      error: error.message,
    });
  }
}

async function deleteMyComment(req, res) {
  try {
    const userId = req.user.id;
    const { commentId } = req.params;

    const [comments] = await pool.query(
      'SELECT * FROM comments WHERE id = ? AND user_id = ? LIMIT 1',
      [commentId, userId]
    );

    if (!comments.length) {
      return res.status(404).json({
        message: 'Comment not found',
      });
    }

    const currentComment = comments[0];

    if (currentComment.status === 'deleted') {
      return res.status(400).json({
        message: 'Comment already deleted',
      });
    }

    await pool.query(
      `UPDATE comments
       SET status = 'deleted', comment_text = '[deleted]'
       WHERE id = ?`,
      [commentId]
    );

    if (currentComment.parent_id) {
      await pool.query(
        `UPDATE comments
         SET reply_count = CASE WHEN reply_count > 0 THEN reply_count - 1 ELSE 0 END
         WHERE id = ?`,
        [currentComment.parent_id]
      );
    }

    return res.status(200).json({
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to delete comment',
      error: error.message,
    });
  }
}

module.exports = {
  createComment,
  getVideoComments,
  updateMyComment,
  deleteMyComment,
};