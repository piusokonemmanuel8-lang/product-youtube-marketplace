const express = require('express');
const router = express.Router();

const {
  getCreatorAnalyticsOverview,
  getChannelAnalytics,
  getVideoAnalytics,
  getAdminPlatformAnalytics,
} = require('../controllers/analyticsController');

const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/creator/analytics-overview', protect, getCreatorAnalyticsOverview);
router.get('/creator/channels/:channelId/analytics', protect, getChannelAnalytics);
router.get('/creator/videos/:videoId/analytics', protect, getVideoAnalytics);

/*
  Admin platform analytics
  Query examples:
  /api/analytics/admin/platform
  /api/analytics/admin/platform?date=2026-04-03
  /api/analytics/admin/platform?start_date=2026-04-01&end_date=2026-04-03
*/
router.get('/admin/platform', protect, adminOnly, getAdminPlatformAnalytics);

module.exports = router;