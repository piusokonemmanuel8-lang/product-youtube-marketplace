const express = require('express');
const router = express.Router();

const {
  getPublicWatchPage,
  recordPublicVideoView,
  getRelatedVideos,
} = require('../controllers/publicWatchController');

const { protect } = require('../middleware/authMiddleware');

router.get('/watch/:slug', getPublicWatchPage);
router.post('/videos/:videoId/views', protect, recordPublicVideoView);
router.get('/videos/:videoId/related', getRelatedVideos);

module.exports = router;