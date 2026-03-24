const express = require('express');
const router = express.Router();

const {
  upsertWatchHistory,
  getMyWatchHistory,
  getMyVideoWatchHistory,
  deleteMyVideoWatchHistory,
} = require('../controllers/watchHistoryController');

const { protect } = require('../middleware/authMiddleware');

router.get('/watch-history', protect, getMyWatchHistory);
router.get('/watch-history/:videoId', protect, getMyVideoWatchHistory);
router.post('/videos/:videoId/watch-history', protect, upsertWatchHistory);
router.delete('/watch-history/:videoId', protect, deleteMyVideoWatchHistory);

module.exports = router;