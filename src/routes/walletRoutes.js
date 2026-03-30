const express = require('express');
const router = express.Router();

const { protect, creatorOnly } = require('../middleware/authMiddleware');
const {
  getMyWallet,
  getMyWalletTransactionById,
  topUpMyWallet,
  deleteMyWalletTransaction,
} = require('../controllers/walletController');

router.get('/creator/wallet', protect, creatorOnly, getMyWallet);
router.get('/creator/wallet/transactions/:transactionId', protect, creatorOnly, getMyWalletTransactionById);
router.post('/creator/wallet/topup', protect, creatorOnly, topUpMyWallet);
router.delete('/creator/wallet/transactions/:transactionId', protect, creatorOnly, deleteMyWalletTransaction);

module.exports = router;