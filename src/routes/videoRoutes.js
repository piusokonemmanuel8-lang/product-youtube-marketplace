const express = require('express');
const router = express.Router();

const {
  createVideoUploadUrl,
  createVideo,
  getMyVideos,
  getVideoBySlug,
  updateMyVideo,
  deleteMyVideo,
} = require('../controllers/videoController');

const { protect } = require('../middleware/authMiddleware');

router.post('/upload-url', protect, createVideoUploadUrl);
router.post('/', protect, createVideo);
router.get('/me', protect, getMyVideos);
router.put('/:id', protect, updateMyVideo);
router.delete('/:id', protect, deleteMyVideo);
router.get('/:slug', getVideoBySlug);

module.exports = router;