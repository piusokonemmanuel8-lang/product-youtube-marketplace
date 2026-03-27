const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '/api';

function getToken() {
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('videogad_token') ||
    localStorage.getItem('authToken') ||
    ''
  );
}

function buildUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (API_BASE === '/api') {
    if (cleanPath.startsWith('/api/')) {
      return cleanPath;
    }
    return `/api${cleanPath}`;
  }

  if (cleanPath.startsWith('/api/')) {
    return `${API_BASE}${cleanPath}`;
  }

  return `${API_BASE}${cleanPath}`;
}

export async function apiRequest(path, options = {}) {
  const token = getToken();

  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const fetchOptions = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body !== undefined) {
    fetchOptions.body =
      typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  let response;

  try {
    response = await fetch(buildUrl(path), fetchOptions);
  } catch (error) {
    throw new Error('Network error');
  }

  const contentType = response.headers.get('content-type') || '';
  let data = null;

  try {
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
  } catch (error) {
    data = null;
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      (typeof data === 'string' && data) ||
      'Request failed';

    throw new Error(message);
  }

  return data;
}

const api = {
  request: apiRequest,
};

export default api;