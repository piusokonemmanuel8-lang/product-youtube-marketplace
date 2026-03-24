const pool = require('../config/db');

async function createNotification(req, res) {
  try {
    const { user_id, type, title, message, data_json } = req.body;

    if (!user_id || !type || !title || !message) {
      return res.status(400).json({
        message: 'user_id, type, title, and message are required',
      });
    }

    const [users] = await pool.query(
      'SELECT id FROM users WHERE id = ? LIMIT 1',
      [user_id]
    );

    if (!users.length) {
      return res.status(404).json({
        message: 'Target user not found',
      });
    }

    const [result] = await pool.query(
      `INSERT INTO notifications
      (user_id, type, title, message, data_json, is_read)
      VALUES (?, ?, ?, ?, ?, 0)`,
      [user_id, type, title, message, data_json || null]
    );

    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE id = ? LIMIT 1',
      [result.insertId]
    );

    return res.status(201).json({
      message: 'Notification created successfully',
      notification: rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to create notification',
      error: error.message,
    });
  }
}

async function getMyNotifications(req, res) {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT *
       FROM notifications
       WHERE user_id = ?
       ORDER BY id DESC`,
      [userId]
    );

    return res.status(200).json({
      notifications: rows,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch notifications',
      error: error.message,
    });
  }
}

async function markNotificationAsRead(req, res) {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE id = ? AND user_id = ? LIMIT 1',
      [notificationId, userId]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: 'Notification not found',
      });
    }

    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE id = ?',
      [notificationId]
    );

    const [updatedRows] = await pool.query(
      'SELECT * FROM notifications WHERE id = ? LIMIT 1',
      [notificationId]
    );

    return res.status(200).json({
      message: 'Notification marked as read successfully',
      notification: updatedRows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to mark notification as read',
      error: error.message,
    });
  }
}

async function markAllMyNotificationsAsRead(req, res) {
  try {
    const userId = req.user.id;

    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    return res.status(200).json({
      message: 'All notifications marked as read successfully',
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to mark all notifications as read',
      error: error.message,
    });
  }
}

module.exports = {
  createNotification,
  getMyNotifications,
  markNotificationAsRead,
  markAllMyNotificationsAsRead,
};