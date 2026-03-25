import { apiRequest } from './api';

export async function getCategories() {
  return apiRequest('/categories', {
    method: 'GET',
  });
}

export async function getCategoryTree() {
  return apiRequest('/categories/tree', {
    method: 'GET',
  });
}