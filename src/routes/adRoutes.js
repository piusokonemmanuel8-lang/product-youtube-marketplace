const express = require('express');
const router = express.Router();

const {
  createAdCampaign,
  approveAdCampaign,
  pauseAdCampaign,
  deleteAdCampaign,
  getAllAdCampaigns,
  getPendingAdCampaigns,
  getMyAdCampaigns,
} = require('../controllers/adController');

const { protect, creatorOnly, adminOnly } = require('../middleware/authMiddleware');

router.post('/campaigns', protect, creatorOnly, createAdCampaign);

router.get('/my-campaigns', protect, creatorOnly, getMyAdCampaigns);

router.get('/campaigns', protect, adminOnly, getAllAdCampaigns);
router.get('/campaigns/pending', protect, adminOnly, getPendingAdCampaigns);

router.put('/campaigns/:id/approve', protect, adminOnly, approveAdCampaign);
router.put('/campaigns/:id/pause', protect, adminOnly, pauseAdCampaign);
router.delete('/campaigns/:id', protect, adminOnly, deleteAdCampaign);

module.exports = router;