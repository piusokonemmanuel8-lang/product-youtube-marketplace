import { apiRequest } from './api';

export async function getChannelBySlug(slug) {
  return apiRequest(`/channels/${slug}`, {
    method: 'GET',
  });
}

export async function getChannelSubscription(channelId) {
  return apiRequest(`/channels/${channelId}/subscription`, {
    method: 'GET',
  });
}

export async function subscribeToChannel(channelId) {
  return apiRequest(`/channels/${channelId}/subscription`, {
    method: 'POST',
  });
}

export async function unsubscribeFromChannel(channelId) {
  return apiRequest(`/channels/${channelId}/subscription`, {
    method: 'DELETE',
  });
}