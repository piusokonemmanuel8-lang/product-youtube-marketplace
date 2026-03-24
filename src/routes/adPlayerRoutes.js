const express = require('express');
const router = express.Router();

const { getAdForVideo } = require('../controllers/adPlayerController');

router.get('/player', getAdForVideo);

module.exports = router;