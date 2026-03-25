const express = require('express');
console.log('LOADED CREATOR PROFILE ROUTES FILE');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const {
  createCreatorProfile,
  getMyCreatorProfile,
} = require('../controllers/creatorProfileController');

router.post('/profile', protect, createCreatorProfile);
router.get('/profile', protect, getMyCreatorProfile);

module.exports = router;