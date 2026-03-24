const express = require('express');
const router = express.Router();

const { trackAdImpression } = require('../controllers/adTrackingController');

router.post('/impressions', trackAdImpression);

module.exports = router;