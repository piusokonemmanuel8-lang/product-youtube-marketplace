const express = require('express');
const router = express.Router();

const { getAdForVideo, getFeaturedAds } = require('../controllers/adPlayerController');

router.get('/player', getAdForVideo);
router.get('/featured', getFeaturedAds);

module.exports = router;