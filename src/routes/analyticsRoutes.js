const express = require('express');
const router = express.Router();

const {
  getCreatorAnalyticsOverview,
  getChannelAnalytics,
  getVideoAnalytics,
} = require('../controllers/analyticsController');

const { protect } = require('../middleware/authMiddleware');

router.get('/creator/analytics-overview', protect, getCreatorAnalyticsOverview);
router.get('/creator/channels/:channelId/analytics', protect, getChannelAnalytics);
router.get('/creator/videos/:videoId/analytics', protect, getVideoAnalytics);

module.exports = router;