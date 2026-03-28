import { apiRequest } from './api';

export async function getWatchPageBySlug(slug) {
  return apiRequest(`/watch/${slug}`, {
    method: 'GET',
  });
}

export async function addVideoView(videoId) {
  return apiRequest(`/videos/${videoId}/views`, {
    method: 'POST',
  });
}

export async function getRelatedVideos(videoId) {
  return apiRequest(`/videos/${videoId}/related`, {
    method: 'GET',
  });
}

export async function getVideoReactions(videoId) {
  return apiRequest(`/videos/${videoId}/reactions`, {
    method: 'GET',
  });
}

export async function addVideoReaction(videoId, payload) {
  return apiRequest(`/videos/${videoId}/reactions`, {
    method: 'POST',
    body: payload,
  });
}

export async function removeVideoReaction(videoId) {
  return apiRequest(`/videos/${videoId}/reactions`, {
    method: 'DELETE',
  });
}

export async function getVideoComments(videoId) {
  return apiRequest(`/videos/${videoId}/comments`, {
    method: 'GET',
  });
}

export async function addVideoComment(videoId, payload) {
  return apiRequest(`/videos/${videoId}/comments`, {
    method: 'POST',
    body: payload,
  });
}

export async function updateComment(commentId, payload) {
  return apiRequest(`/comments/${commentId}`, {
    method: 'PUT',
    body: payload,
  });
}

export async function deleteComment(commentId) {
  return apiRequest(`/comments/${commentId}`, {
    method: 'DELETE',
  });
}

export async function addWatchHistory(videoId) {
  return apiRequest(`/videos/${videoId}/watch-history`, {
    method: 'POST',
  });
}

export async function saveVideo(videoId) {
  return apiRequest(`/videos/${videoId}/save`, {
    method: 'POST',
  });
}

export async function unsaveVideo(videoId) {
  return apiRequest(`/videos/${videoId}/save`, {
    method: 'DELETE',
  });
}

export async function shareVideo(videoId, payload = {}) {
  return apiRequest(`/videos/${videoId}/share`, {
    method: 'POST',
    body: payload,
  });
}

export async function getShareSummary(videoId) {
  return apiRequest(`/videos/${videoId}/share-summary`, {
    method: 'GET',
  });
}

export async function getVideoTags(videoId) {
  return apiRequest(`/videos/${videoId}/tags`, {
    method: 'GET',
  });
}

export async function recordProductClick(videoId, payload = {}) {
  return apiRequest(`/videos/${videoId}/product-click`, {
    method: 'POST',
    body: payload,
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