const pool = require('../config/db');

async function submitToModerationQueue(req, res) {
  try {
    const { entity_type, entity_id, reason } = req.body;

    if (!['video', 'comment', 'channel', 'creator'].includes(entity_type)) {
      return res.status(400).json({
        message: 'entity_type must be video, comment, channel, or creator',
      });
    }

    if (!entity_id) {
      return res.status(400).json({
        message: 'entity_id is required',
      });
    }

    const [existingRows] = await pool.query(
      `SELECT id
       FROM moderation_queue
       WHERE entity_type = ? AND entity_id = ? AND moderation_status = 'pending'
       LIMIT 1`,
      [entity_type, entity_id]
    );

    if (existingRows.length) {
      return res.status(200).json({
        message: 'Entity is already in moderation queue',
      });
    }

    await pool.query(
      `INSERT INTO moderation_queue
       (entity_type, entity_id, moderation_status, reason)
       VALUES (?, ?, 'pending', ?)`,
      [entity_type, entity_id, reason || null]
    );

    return res.status(201).json({
      message: 'Entity submitted to moderation queue successfully',
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to submit to moderation queue',
      error: error.message,
    });
  }
}

async function getModerationQueue(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT *
       FROM moderation_queue
       ORDER BY id DESC`
    );

    return res.status(200).json({
      moderation_queue: rows,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch moderation queue',
      error: error.message,
    });
  }
}

async function reviewModerationItem(req, res) {
  try {
    const adminUserId = req.user.id;
    const { queueId } = req.params;
    const { moderation_status, reason } = req.body;

    if (!['approved', 'rejected'].includes(moderation_status)) {
      return res.status(400).json({
        message: 'moderation_status must be approved or rejected',
      });
    }

    const [rows] = await pool.query(
      'SELECT * FROM moderation_queue WHERE id = ? LIMIT 1',
      [queueId]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: 'Moderation item not found',
      });
    }

    const item = rows[0];

    await pool.query(
      `UPDATE moderation_queue
       SET moderation_status = ?, reason = ?, reviewed_by = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [moderation_status, reason !== undefined ? reason : item.reason, adminUserId, queueId]
    );

    if (item.entity_type === 'video') {
      await pool.query(
        `UPDATE videos
         SET moderation_status = ?
         WHERE id = ?`,
        [moderation_status, item.entity_id]
      );
    }

    if (item.entity_type === 'comment') {
      if (moderation_status === 'approved') {
        await pool.query(
          `UPDATE comments
           SET status = 'active'
           WHERE id = ?`,
          [item.entity_id]
        );
      } else {
        await pool.query(
          `UPDATE comments
           SET status = 'hidden'
           WHERE id = ?`,
          [item.entity_id]
        );
      }
    }

    if (item.entity_type === 'channel') {
      if (moderation_status === 'approved') {
        await pool.query(
          `UPDATE channels
           SET status = 'active'
           WHERE id = ?`,
          [item.entity_id]
        );
      } else {
        await pool.query(
          `UPDATE channels
           SET status = 'suspended'
           WHERE id = ?`,
          [item.entity_id]
        );
      }
    }

    if (item.entity_type === 'creator') {
      if (moderation_status === 'approved') {
        await pool.query(
          `UPDATE creator_profiles
           SET status = 'active'
           WHERE id = ?`,
          [item.entity_id]
        );
      } else {
        await pool.query(
          `UPDATE creator_profiles
           SET status = 'suspended'
           WHERE id = ?`,
          [item.entity_id]
        );
      }
    }

    const [updatedRows] = await pool.query(
      'SELECT * FROM moderation_queue WHERE id = ? LIMIT 1',
      [queueId]
    );

    return res.status(200).json({
      message: 'Moderation item reviewed successfully',
      moderation_item: updatedRows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to review moderation item',
      error: error.message,
    });
  }
}

async function submitReport(req, res) {
  try {
    const reporterUserId = req.user.id;
    const { report_type, target_id, reason, details } = req.body;

    if (!['video', 'comment', 'channel'].includes(report_type)) {
      return res.status(400).json({
        message: 'report_type must be video, comment, or channel',
      });
    }

    if (!target_id || !reason) {
      return res.status(400).json({
        message: 'target_id and reason are required',
      });
    }

    const [result] = await pool.query(
      `INSERT INTO reports
       (reporter_user_id, report_type, target_id, reason, details, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [reporterUserId, report_type, target_id, reason, details || null]
    );

    const [rows] = await pool.query(
      'SELECT * FROM reports WHERE id = ? LIMIT 1',
      [result.insertId]
    );

    return res.status(201).json({
      message: 'Report submitted successfully',
      report: rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to submit report',
      error: error.message,
    });
  }
}

async function getReports(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT *
       FROM reports
       ORDER BY id DESC`
    );

    return res.status(200).json({
      reports: rows,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch reports',
      error: error.message,
    });
  }
}

async function updateReportStatus(req, res) {
  try {
    const { reportId } = req.params;
    const { status } = req.body;

    if (!['pending', 'reviewed', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({
        message: 'status must be pending, reviewed, resolved, or dismissed',
      });
    }

    const [rows] = await pool.query(
      'SELECT * FROM reports WHERE id = ? LIMIT 1',
      [reportId]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: 'Report not found',
      });
    }

    await pool.query(
      `UPDATE reports
       SET status = ?, resolved_at = CASE WHEN ? IN ('resolved', 'dismissed') THEN NOW() ELSE NULL END
       WHERE id = ?`,
      [status, status, reportId]
    );

    const [updatedRows] = await pool.query(
      'SELECT * FROM reports WHERE id = ? LIMIT 1',
      [reportId]
    );

    return res.status(200).json({
      message: 'Report status updated successfully',
      report: updatedRows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to update report status',
      error: error.message,
    });
  }
}

module.exports = {
  submitToModerationQueue,
  getModerationQueue,
  reviewModerationItem,
  submitReport,
  getReports,
  updateReportStatus,
};