const express = require('express');
const router = express.Router();

const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  getCreatorMonetizationEligibility,
  getMyMonetizationApplication,
  applyForMonetization,
  getAdminMonetizationApplications,
  getAdminMonetizationApplicationById,
  updateMonetizationApplicationStatus,
} = require('../controllers/monetizationController');

// creator
router.get('/creator/monetization/eligibility', protect, getCreatorMonetizationEligibility);
router.get('/creator/monetization/application', protect, getMyMonetizationApplication);
router.post('/creator/monetization/apply', protect, applyForMonetization);

// admin
router.get('/admin/monetization/applications', protect, adminOnly, getAdminMonetizationApplications);
router.get('/admin/monetization/applications/:applicationId', protect, adminOnly, getAdminMonetizationApplicationById);
router.put('/admin/monetization/applications/:applicationId/status', protect, adminOnly, updateMonetizationApplicationStatus);

module.exports = router;