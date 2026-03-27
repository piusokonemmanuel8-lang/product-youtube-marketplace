import { apiRequest } from './api';

export async function getChannelBySlug(slug) {
  return apiRequest(`/api/channels/${slug}`, {
    method: 'GET',
  });
}

export async function getChannelSubscription(channelId) {
  return apiRequest(`/api/channels/${channelId}/subscription`, {
    method: 'GET',
  });
}

export async function subscribeToChannel(channelId) {
  return apiRequest(`/api/channels/${channelId}/subscribe`, {
    method: 'POST',
  });
}

export async function unsubscribeFromChannel(channelId) {
  return apiRequest(`/api/channels/${channelId}/subscribe`, {
    method: 'DELETE',
  });
}