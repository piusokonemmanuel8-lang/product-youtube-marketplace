const express = require('express');
const router = express.Router();

const {
  createAdCampaign,
  approveAdCampaign,
} = require('../controllers/adController');

const { protect, creatorOnly, adminOnly } = require('../middleware/authMiddleware');

router.post('/campaigns', protect, creatorOnly, createAdCampaign);
router.put('/campaigns/:id/approve', protect, adminOnly, approveAdCampaign);

module.exports = router;