const express = require('express');
const router = express.Router();

const {
  submitToModerationQueue,
  getModerationQueue,
  reviewModerationItem,
  submitReport,
  getReports,
  updateReportStatus,
} = require('../controllers/moderationController');

const { protect, adminOnly } = require('../middleware/authMiddleware');

router.post('/moderation-queue', protect, submitToModerationQueue);
router.get('/moderation-queue', protect, adminOnly, getModerationQueue);
router.put('/moderation-queue/:queueId/review', protect, adminOnly, reviewModerationItem);

router.post('/reports', protect, submitReport);
router.get('/reports', protect, adminOnly, getReports);
router.put('/reports/:reportId/status', protect, adminOnly, updateReportStatus);

module.exports = router;