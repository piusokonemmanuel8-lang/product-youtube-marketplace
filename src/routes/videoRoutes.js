const express = require('express');
const router = express.Router();

const {
  createVideoUploadUrl,
  createVideo,
  getMyVideos,
  getPublicVideos,
  getAdminVideos,
  getAdminVideoById,
  updateAdminVideoStatus,
  getVideoBySlug,
  updateMyVideo,
  deleteMyVideo,
  deleteAdminVideo,
  uploadProcessedVideoFile,
} = require('../controllers/videoController');

const { protect, adminOnly } = require('../middleware/authMiddleware');
const uploadVideoToTemp = require('../middleware/uploadVideoToTemp');

router.get('/public', getPublicVideos);

router.get('/admin/all', protect, adminOnly, getAdminVideos);
router.get('/admin/:id', protect, adminOnly, getAdminVideoById);
router.put('/admin/:id/status', protect, adminOnly, updateAdminVideoStatus);
router.delete('/admin/:id', protect, adminOnly, deleteAdminVideo);

/*
  Keep this old route for image uploads like thumbnails if you still want direct S3 for images.
  We will stop using it for main video files on the frontend.
*/
router.post('/upload-url', protect, createVideoUploadUrl);

/*
  New flow for main video file:
  browser -> backend temp file -> ffmpeg -> s3 -> return final key
*/
router.post('/upload-file', protect, uploadVideoToTemp.single('video_file'), uploadProcessedVideoFile);

router.post('/', protect, createVideo);
router.get('/me', protect, getMyVideos);
router.put('/:id', protect, updateMyVideo);
router.delete('/:id', protect, deleteMyVideo);
router.get('/:slug', getVideoBySlug);

module.exports = router;