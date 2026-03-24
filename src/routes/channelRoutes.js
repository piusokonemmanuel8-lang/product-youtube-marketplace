const express = require('express');
const router = express.Router();

const {
  createChannel,
  getMyChannel,
  updateMyChannel,
  getChannelBySlug,
  deleteMyChannel,
} = require('../controllers/channelController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createChannel);
router.get('/me', protect, getMyChannel);
router.put('/me', protect, updateMyChannel);
router.delete('/me', protect, deleteMyChannel);
router.get('/:slug', getChannelBySlug);

module.exports = router;