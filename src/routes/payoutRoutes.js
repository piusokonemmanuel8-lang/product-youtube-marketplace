const express = require('express');
const router = express.Router();

const {
  addPayoutMethod,
  getMyPayoutMethods,
  createPayoutRequest,
  getMyPayoutRequests,
  getMyPayoutTransactions,
} = require('../controllers/payoutController');

const { protect, creatorOnly } = require('../middleware/authMiddleware');

router.post('/creator/payout-methods', protect, creatorOnly, addPayoutMethod);
router.get('/creator/payout-methods', protect, creatorOnly, getMyPayoutMethods);
router.post('/creator/payout-requests', protect, creatorOnly, createPayoutRequest);
router.get('/creator/payout-requests', protect, creatorOnly, getMyPayoutRequests);
router.get('/creator/payout-transactions', protect, creatorOnly, getMyPayoutTransactions);

module.exports = router;