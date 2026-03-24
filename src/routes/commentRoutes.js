const express = require('express');
const router = express.Router();

const {
  createComment,
  getVideoComments,
  updateMyComment,
  deleteMyComment,
} = require('../controllers/commentController');

const { protect } = require('../middleware/authMiddleware');

router.get('/videos/:videoId/comments', getVideoComments);
router.post('/videos/:videoId/comments', protect, createComment);
router.put('/comments/:commentId', protect, updateMyComment);
router.delete('/comments/:commentId', protect, deleteMyComment);

module.exports = router;