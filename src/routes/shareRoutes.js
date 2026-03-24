const express = require('express');
const router = express.Router();

const {
  recordVideoShare,
  getVideoShareSummary,
  getMyShares,
} = require('../controllers/shareController');

const { protect } = require('../middleware/authMiddleware');

router.post('/videos/:videoId/share', protect, recordVideoShare);
router.get('/videos/:videoId/share-summary', getVideoShareSummary);
router.get('/my-shares', protect, getMyShares);

module.exports = router;