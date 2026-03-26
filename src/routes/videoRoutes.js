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
} = require('../controllers/videoController');

const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/public', getPublicVideos);

router.get('/admin/all', protect, adminOnly, getAdminVideos);
router.get('/admin/:id', protect, adminOnly, getAdminVideoById);
router.put('/admin/:id/status', protect, adminOnly, updateAdminVideoStatus);
router.delete('/admin/:id', protect, adminOnly, deleteAdminVideo);

router.post('/upload-url', protect, createVideoUploadUrl);
router.post('/', protect, createVideo);
router.get('/me', protect, getMyVideos);
router.put('/:id', protect, updateMyVideo);
router.delete('/:id', protect, deleteMyVideo);
router.get('/:slug', getVideoBySlug);

module.exports = router;