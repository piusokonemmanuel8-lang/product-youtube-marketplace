import { apiRequest } from './api';

function buildQuery(params = {}) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });

  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function getPublicVideos(params = {}) {
  return apiRequest(`/videos/public${buildQuery(params)}`, {
    method: 'GET',
  });
}

export async function getSavedVideos() {
  return apiRequest('/saved-videos', {
    method: 'GET',
  });
}

export async function getWatchHistoryVideos() {
  return apiRequest('/watch-history', {
    method: 'GET',
  });
}