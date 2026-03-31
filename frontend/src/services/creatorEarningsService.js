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

export async function getCreatorEarningsDashboard(params = {}) {
  return apiRequest(`/api/creator-earnings${buildQuery(params)}`, {
    method: 'GET',
  });
}

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