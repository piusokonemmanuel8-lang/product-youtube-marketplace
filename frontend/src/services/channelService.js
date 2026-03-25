import api from './api';

export async function getChannelBySlug(slug) {
  const response = await api.get(`/channels/${slug}`);
  return response.data;
}

export async function getChannelSubscription(channelId) {
  const response = await api.get(`/channels/${channelId}/subscription`);
  return response.data;
}

export async function subscribeToChannel(channelId) {
  const response = await api.post(`/channels/${channelId}/subscribe`);
  return response.data;
}

export async function unsubscribeFromChannel(channelId) {
  const response = await api.delete(`/channels/${channelId}/subscribe`);
  return response.data;
}