const express = require('express');
const router = express.Router();

const {
  addPayoutMethod,
  getMyPayoutMethods,
  createPayoutRequest,
  getMyPayoutRequests,
  getMyPayoutTransactions,
  getAdminPayoutRequests,
  updateAdminPayoutRequestStatus,
  markAdminPayoutRequestPaid,
} = require('../controllers/payoutController');

const { protect, creatorOnly, adminOnly } = require('../middleware/authMiddleware');

// creator
router.post('/creator/payout-methods', protect, creatorOnly, addPayoutMethod);
router.get('/creator/payout-methods', protect, creatorOnly, getMyPayoutMethods);
router.post('/creator/payout-requests', protect, creatorOnly, createPayoutRequest);
router.get('/creator/payout-requests', protect, creatorOnly, getMyPayoutRequests);
router.get('/creator/payout-transactions', protect, creatorOnly, getMyPayoutTransactions);

// admin
router.get('/admin/payout-requests', protect, adminOnly, getAdminPayoutRequests);
router.put('/admin/payout-requests/:requestId/status', protect, adminOnly, updateAdminPayoutRequestStatus);
router.put('/admin/payout-requests/:requestId/pay', protect, adminOnly, markAdminPayoutRequestPaid);

module.exports = router;