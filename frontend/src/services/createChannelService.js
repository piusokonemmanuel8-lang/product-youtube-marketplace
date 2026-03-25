import { apiRequest } from './api';

export async function getMyChannel() {
  return apiRequest('/channels/me', {
    method: 'GET',
  });
}

export async function createChannel(payload) {
  return apiRequest('/channels/', {
    method: 'POST',
    body: payload,
  });
}

export async function updateMyChannel(payload) {
  return apiRequest('/channels/me', {
    method: 'PUT',
    body: payload,
  });
}

export async function deleteMyChannel() {
  return apiRequest('/channels/me', {
    method: 'DELETE',
  });
}