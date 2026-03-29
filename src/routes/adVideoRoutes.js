// File: src/routes/adVideoRoutes.js

const express = require('express');
const router = express.Router();

const {
  createAdVideo,
  getAllAdVideos,
  getPendingAdVideos,
  getMyAdVideos,
} = require('../controllers/adVideoController');

const { protect, creatorOnly, adminOnly } = require('../middleware/authMiddleware');
const { uploadAdMedia } = require('../middleware/upload');

router.post(
  '/videos',
  protect,
  creatorOnly,
  (req, res, next) => {
    uploadAdMedia(req, res, function (error) {
      if (error) {
        return res.status(400).json({
          message: 'Ad media upload failed',
          error: error.message,
        });
      }
      next();
    });
  },
  createAdVideo
);

router.get('/my-videos', protect, creatorOnly, getMyAdVideos);

router.get('/videos', protect, adminOnly, getAllAdVideos);
router.get('/videos/pending', protect, adminOnly, getPendingAdVideos);

module.exports = router;