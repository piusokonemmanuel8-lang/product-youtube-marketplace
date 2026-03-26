import { apiRequest } from './api';

export async function getMarketplaceAuthStatus() {
  return apiRequest('/creator/marketplace-auth', {
    method: 'GET',
  });
}

export async function createMarketplaceAuth(payload) {
  return apiRequest('/creator/marketplace-auth', {
    method: 'POST',
    body: payload,
  });
}

export async function getExternalPostingPlans() {
  return apiRequest('/external-posting-plans', {
    method: 'GET',
  });
}

export async function createExternalPostingSubscription(payload) {
  return apiRequest('/creator/external-posting-subscriptions', {
    method: 'POST',
    body: payload,
  });
}

export async function getCurrentExternalPostingSubscription() {
  return apiRequest('/creator/external-posting-subscriptions/current', {
    method: 'GET',
  });
}