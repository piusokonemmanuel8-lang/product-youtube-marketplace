const express = require('express');
const router = express.Router();

const { protect, creatorOnly } = require('../middleware/authMiddleware');
const { getMyWallet, topUpMyWallet } = require('../controllers/walletController');

router.get('/creator/wallet', protect, creatorOnly, getMyWallet);
router.post('/creator/wallet/topup', protect, creatorOnly, topUpMyWallet);

module.exports = router;