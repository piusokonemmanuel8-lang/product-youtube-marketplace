const express = require('express');
const router = express.Router();

const {
  createTag,
  getAllTags,
  attachTagsToMyVideo,
  getVideoTags,
} = require('../controllers/tagController');

const { protect } = require('../middleware/authMiddleware');

router.post('/tags', protect, createTag);
router.get('/tags', getAllTags);
router.post('/videos/:videoId/tags', protect, attachTagsToMyVideo);
router.get('/videos/:videoId/tags', getVideoTags);

module.exports = router;