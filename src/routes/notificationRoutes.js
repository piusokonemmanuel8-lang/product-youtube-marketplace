const express = require('express');
const router = express.Router();

const {
  createNotification,
  getMyNotifications,
  markNotificationAsRead,
  markAllMyNotificationsAsRead,
} = require('../controllers/notificationController');

const { protect } = require('../middleware/authMiddleware');

router.post('/notifications', protect, createNotification);
router.get('/notifications', protect, getMyNotifications);
router.put('/notifications/:notificationId/read', protect, markNotificationAsRead);
router.put('/notifications/read-all', protect, markAllMyNotificationsAsRead);

module.exports = router;