import { apiRequest } from './api';

export async function getCreatorPayoutMethods() {
  return apiRequest('/api/creator/payout-methods', {
    method: 'GET',
  });
}

export async function createCreatorPayoutMethod(payload) {
  return apiRequest('/api/creator/payout-methods', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getCreatorPayoutRequests() {
  return apiRequest('/api/creator/payout-requests', {
    method: 'GET',
  });
}

export async function createCreatorPayoutRequest(payload) {
  return apiRequest('/api/creator/payout-requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getCreatorPayoutTransactions() {
  return apiRequest('/api/creator/payout-transactions', {
    method: 'GET',
  });
}