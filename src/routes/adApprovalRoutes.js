const express = require('express');
const router = express.Router();

const { approveAdVideo } = require('../controllers/adApprovalController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.put('/videos/:id/approve', protect, adminOnly, approveAdVideo);

module.exports = router;