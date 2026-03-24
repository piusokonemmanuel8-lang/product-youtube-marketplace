const express = require('express');
const router = express.Router();

const { trackAdSkip } = require('../controllers/adSkipController');

router.post('/skips', trackAdSkip);

module.exports = router;