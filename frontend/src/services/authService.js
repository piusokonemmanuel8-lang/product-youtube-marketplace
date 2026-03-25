import { apiRequest } from './api';

export async function testAuthApi() {
  return apiRequest('/auth/test-root', {
    method: 'GET',
  });
}

export async function registerUser(payload) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: payload,
  });
}

export async function loginUser(payload) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: payload,
  });
}

export async function getCurrentUser() {
  return apiRequest('/auth/me', {
    method: 'GET',
  });
}