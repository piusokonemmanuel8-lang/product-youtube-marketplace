const express = require('express');
const router = express.Router();

const { getCampaignStats } = require('../controllers/adReportController');

router.get('/campaigns/:id/stats', getCampaignStats);

module.exports = router;