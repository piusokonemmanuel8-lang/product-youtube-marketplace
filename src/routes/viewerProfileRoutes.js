const express = require('express');
const router = express.Router();

const {
  upsertMyViewerProfile,
  getMyViewerProfile,
} = require('../controllers/viewerProfileController');

const { protect } = require('../middleware/authMiddleware');

router.post('/viewer/profile', protect, upsertMyViewerProfile);
router.get('/viewer/profile', protect, getMyViewerProfile);

module.exports = router;