const express = require('express');
const router = express.Router();

const {
  subscribeToChannel,
  unsubscribeFromChannel,
  getChannelSubscriptionSummary,
} = require('../controllers/channelSubscriptionController');

const { protect } = require('../middleware/authMiddleware');

router.get('/channels/:channelId/subscription', protect, getChannelSubscriptionSummary);
router.post('/channels/:channelId/subscription', protect, subscribeToChannel);
router.delete('/channels/:channelId/subscription', protect, unsubscribeFromChannel);

module.exports = router;