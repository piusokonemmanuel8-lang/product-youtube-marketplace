const express = require('express');
const router = express.Router();

const {
  createAdCampaign,
  approveAdCampaign,
  getAllAdCampaigns,
  getPendingAdCampaigns,
} = require('../controllers/adController');

const { protect, creatorOnly, adminOnly } = require('../middleware/authMiddleware');

router.post('/campaigns', protect, creatorOnly, createAdCampaign);

router.get('/campaigns', protect, adminOnly, getAllAdCampaigns);
router.get('/campaigns/pending', protect, adminOnly, getPendingAdCampaigns);

router.put('/campaigns/:id/approve', protect, adminOnly, approveAdCampaign);

module.exports = router;