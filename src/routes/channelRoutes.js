console.log('LOADED CHANNEL ROUTES FILE');

const express = require('express');
const router = express.Router();

const {
  createChannel,
  getMyChannel,
  updateMyChannel,
  getChannelBySlug,
  deleteMyChannel,
  getAdminChannels,
  getAdminChannelById,
  updateAdminChannel,
  deleteAdminChannel,
} = require('../controllers/channelController');

const { protect, adminOnly } = require('../middleware/authMiddleware');

router.post('/', protect, createChannel);
router.get('/me', protect, getMyChannel);
router.put('/me', protect, updateMyChannel);
router.delete('/me', protect, deleteMyChannel);

router.get('/admin/test', (req, res) => {
  res.json({
    message: 'channel admin route works',
  });
});

router.get('/debug-channels-open', getAdminChannels);

router.get('/admin/all', protect, adminOnly, getAdminChannels);
router.get('/admin/:id', protect, adminOnly, getAdminChannelById);
router.put('/admin/:id', protect, adminOnly, updateAdminChannel);
router.delete('/admin/:id', protect, adminOnly, deleteAdminChannel);

router.get('/:slug', getChannelBySlug);

module.exports = router;