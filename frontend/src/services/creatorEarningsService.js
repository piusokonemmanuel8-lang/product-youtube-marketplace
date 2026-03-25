import { apiRequest } from './api';

export async function getCreatorPayoutTransactions() {
  return apiRequest('/api/creator/payout-transactions', {
    method: 'GET',
  });
}

export async function getCreatorPayoutRequests() {
  return apiRequest('/api/creator/payout-requests', {
    method: 'GET',
  });
}