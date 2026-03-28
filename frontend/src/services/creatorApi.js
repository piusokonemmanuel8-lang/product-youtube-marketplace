import { apiRequest } from './api';

export const getCreatorProfile = async () => {
  return apiRequest('/creator/profile', {
    method: 'GET',
  });
};

export const createCreatorProfile = async (payload) => {
  return apiRequest('/creator/profile', {
    method: 'POST',
    body: payload,
  });
};

export const getMyChannel = async () => {
  return apiRequest('/channels/me', {
    method: 'GET',
  });
};