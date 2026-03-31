import { apiRequest } from './api';

export async function getCreatorDashboardSummary() {
  return apiRequest('/creator/dashboard-summary', {
    method: 'GET',
  });
}

export async function getCreatorAnalyticsOverview() {
  return apiRequest('/creator/analytics-overview', {
    method: 'GET',
  });
}

export async function getMarketplaceAuthStatus() {
  return apiRequest('/creator/marketplace-auth', {
    method: 'GET',
  });
}

export async function saveMarketplaceAuth(payload) {
  return apiRequest('/creator/marketplace-auth', {
    method: 'POST',
    body: payload,
  });
}

export async function getExternalPostingPlans() {
  return apiRequest('/external-posting-plans', {
    method: 'GET',
  });
}

export async function getCurrentExternalPostingSubscription() {
  return apiRequest('/creator/external-posting-subscriptions/current', {
    method: 'GET',
  });
}

export async function getMyChannel() {
  return apiRequest('/channels/me', {
    method: 'GET',
  });
}

export async function getMyVideos() {
  return apiRequest('/videos/me', {
    method: 'GET',
  });
}

export async function getChannelAnalytics(channelId) {
  return apiRequest(`/creator/channels/${channelId}/analytics`, {
    method: 'GET',
  });
}

export async function getVideoAnalytics(videoId) {
  return apiRequest(`/creator/videos/${videoId}/analytics`, {
    method: 'GET',
  });
}

export async function getMySupportConversations() {
  return apiRequest('/support/conversations/me', {
    method: 'GET',
  });
}

export async function getMySupportConversation(conversationId) {
  return apiRequest(`/support/conversations/${conversationId}`, {
    method: 'GET',
  });
}

export async function createSupportConversation(payload) {
  return apiRequest('/support/conversations', {
    method: 'POST',
    body: payload,
  });
}

export async function sendSupportMessage(conversationId, payload) {
  return apiRequest(`/support/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: payload,
  });
}

export async function markSupportConversationRead(conversationId) {
  return apiRequest(`/support/conversations/${conversationId}/read`, {
    method: 'PUT',
  });
}