const express = require('express');
const router = express.Router();

const {
  reactToVideo,
  removeVideoReaction,
  getVideoReactionSummary,
} = require('../controllers/videoReactionController');

const { protect } = require('../middleware/authMiddleware');

router.get('/videos/:videoId/reactions', protect, getVideoReactionSummary);
router.post('/videos/:videoId/reactions', protect, reactToVideo);
router.delete('/videos/:videoId/reactions', protect, removeVideoReaction);

module.exports = router;