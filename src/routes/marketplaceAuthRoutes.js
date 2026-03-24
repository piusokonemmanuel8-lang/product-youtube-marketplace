const express = require('express');
const router = express.Router();

const {
  getCreatorMarketplaceAuthStatus,
  upsertCreatorMarketplaceAuth,
  getExternalPostingPlans,
} = require('../controllers/marketplaceAuthController');

const {
  subscribeToExternalPostingPlan,
  getMyExternalPostingSubscription,
  getMyExternalPostingPayments,
  markExternalPostingPaymentPaid,
} = require('../controllers/externalPostingPlanController');

const { protect } = require('../middleware/authMiddleware');

router.get('/creator/marketplace-auth', protect, getCreatorMarketplaceAuthStatus);
router.post('/creator/marketplace-auth', protect, upsertCreatorMarketplaceAuth);
router.get('/external-posting-plans', getExternalPostingPlans);

router.post('/creator/external-posting-subscriptions', protect, subscribeToExternalPostingPlan);
router.get('/creator/external-posting-subscriptions/current', protect, getMyExternalPostingSubscription);
router.get('/creator/external-posting-payments', protect, getMyExternalPostingPayments);
router.put('/creator/external-posting-payments/:paymentId/mark-paid', protect, markExternalPostingPaymentPaid);

module.exports = router;