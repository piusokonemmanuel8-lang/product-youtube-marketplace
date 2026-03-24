const express = require('express');
const router = express.Router();

const {
  saveVideo,
  unsaveVideo,
  getMySavedVideos,
  getMySavedVideoStatus,
} = require('../controllers/savedVideoController');

const { protect } = require('../middleware/authMiddleware');

router.get('/saved-videos', protect, getMySavedVideos);
router.get('/saved-videos/:videoId', protect, getMySavedVideoStatus);
router.post('/videos/:videoId/save', protect, saveVideo);
router.delete('/videos/:videoId/save', protect, unsaveVideo);

module.exports = router;