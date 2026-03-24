const express = require('express');
const router = express.Router();

const {
  getCreatorDashboardSummary,
} = require('../controllers/creatorDashboardController');

const { protect } = require('../middleware/authMiddleware');

router.get('/creator/dashboard-summary', protect, getCreatorDashboardSummary);

module.exports = router;