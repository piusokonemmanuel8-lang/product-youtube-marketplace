import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export async function apiRequest(endpoint, options = {}) {
  const method = (options.method || 'GET').toLowerCase();
  const data = options.body || options.data || null;
  const params = options.params || null;

  const response = await api({
    url: endpoint,
    method,
    data,
    params,
  });

  return response.data;
}

export default api;