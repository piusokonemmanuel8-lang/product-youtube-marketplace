const express = require('express');
const router = express.Router();

const { trackAdClick } = require('../controllers/adClickController');

router.post('/clicks', trackAdClick);

module.exports = router;