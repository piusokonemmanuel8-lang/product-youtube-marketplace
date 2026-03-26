import { apiRequest } from './api';

export async function getPublicVideos(params = {}) {
  return apiRequest('/videos/public', {
    method: 'GET',
    params,
  });
}