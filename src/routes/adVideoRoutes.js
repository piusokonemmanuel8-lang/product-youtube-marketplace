const express = require('express');
const router = express.Router();

const {
  createAdVideo,
  getAllAdVideos,
  getPendingAdVideos,
} = require('../controllers/adVideoController');

const { protect, creatorOnly, adminOnly } = require('../middleware/authMiddleware');

router.post('/videos', protect, creatorOnly, createAdVideo);

router.get('/videos', protect, adminOnly, getAllAdVideos);
router.get('/videos/pending', protect, adminOnly, getPendingAdVideos);

module.exports = router;