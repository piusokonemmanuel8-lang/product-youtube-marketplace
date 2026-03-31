const express = require('express');
const router = express.Router();

const {
  getCreatorEarningsDashboard,
} = require('../controllers/creatorEarningsController');

const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getCreatorEarningsDashboard);

module.exports = router;