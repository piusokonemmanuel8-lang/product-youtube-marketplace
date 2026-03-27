import { apiRequest } from './api';

export async function getWatchPageBySlug(slug) {
  return apiRequest(`/api/watch/${slug}`, {
    method: 'GET',
  });
}

export async function addVideoView(videoId) {
  return apiRequest(`/api/videos/${videoId}/views`, {
    method: 'POST',
  });
}

export async function getRelatedVideos(videoId) {
  return apiRequest(`/api/videos/${videoId}/related`, {
    method: 'GET',
  });
}

export async function getVideoReactions(videoId) {
  return apiRequest(`/api/videos/${videoId}/reactions`, {
    method: 'GET',
  });
}

export async function addVideoReaction(videoId, payload) {
  return apiRequest(`/api/videos/${videoId}/reactions`, {
    method: 'POST',
    body: payload,
  });
}

export async function removeVideoReaction(videoId) {
  return apiRequest(`/api/videos/${videoId}/reactions`, {
    method: 'DELETE',
  });
}

export async function getVideoComments(videoId) {
  return apiRequest(`/api/videos/${videoId}/comments`, {
    method: 'GET',
  });
}

export async function addVideoComment(videoId, payload) {
  return apiRequest(`/api/videos/${videoId}/comments`, {
    method: 'POST',
    body: payload,
  });
}

export async function updateComment(commentId, payload) {
  return apiRequest(`/api/comments/${commentId}`, {
    method: 'PUT',
    body: payload,
  });
}

export async function deleteComment(commentId) {
  return apiRequest(`/api/comments/${commentId}`, {
    method: 'DELETE',
  });
}

export async function addWatchHistory(videoId) {
  return apiRequest(`/api/videos/${videoId}/watch-history`, {
    method: 'POST',
  });
}

export async function saveVideo(videoId) {
  return apiRequest(`/api/videos/${videoId}/save`, {
    method: 'POST',
  });
}

export async function unsaveVideo(videoId) {
  return apiRequest(`/api/videos/${videoId}/save`, {
    method: 'DELETE',
  });
}

export async function shareVideo(videoId, payload = {}) {
  return apiRequest(`/api/videos/${videoId}/share`, {
    method: 'POST',
    body: payload,
  });
}

export async function getShareSummary(videoId) {
  return apiRequest(`/api/videos/${videoId}/share-summary`, {
    method: 'GET',
  });
}

export async function getVideoTags(videoId) {
  return apiRequest(`/api/videos/${videoId}/tags`, {
    method: 'GET',
  });
}