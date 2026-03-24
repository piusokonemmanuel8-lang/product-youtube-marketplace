console.log('LOADED AUTH ROUTES FILE');

const express = require('express');
const router = express.Router();

const {
  register,
  login,
  getMe,
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');

router.get('/test', (req, res) => {
  res.json({
    message: 'Auth routes file loaded',
  });
});

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

module.exports = router;