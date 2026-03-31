const express = require('express');
const router = express.Router();

const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  createConversation,
  getMyConversations,
  getConversationById,
  sendConversationMessage,
  markConversationAsRead,
  getAdminConversations,
  getAdminConversationById,
  sendAdminConversationMessage,
  updateConversationStatus,
} = require('../controllers/supportController');

// user / creator support
router.post('/support/conversations', protect, createConversation);
router.get('/support/conversations/me', protect, getMyConversations);
router.get('/support/conversations/:conversationId', protect, getConversationById);
router.post('/support/conversations/:conversationId/messages', protect, sendConversationMessage);
router.put('/support/conversations/:conversationId/read', protect, markConversationAsRead);

// admin support
router.get('/support/admin/conversations', protect, adminOnly, getAdminConversations);
router.get('/support/admin/conversations/:conversationId', protect, adminOnly, getAdminConversationById);
router.post('/support/admin/conversations/:conversationId/messages', protect, adminOnly, sendAdminConversationMessage);
router.put('/support/admin/conversations/:conversationId/status', protect, adminOnly, updateConversationStatus);

module.exports = router;