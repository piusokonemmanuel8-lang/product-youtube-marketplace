const express = require('express');
const router = express.Router();

const { createAdVideo } = require('../controllers/adVideoController');
const { protect, creatorOnly } = require('../middleware/authMiddleware');

router.post('/videos', protect, creatorOnly, createAdVideo);

module.exports = router;