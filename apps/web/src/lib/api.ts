import axios from 'axios';

function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // In browser: use same-origin relative path /api (proxied seamlessly by Next.js rewrites)
    return '/api';
  }
  // On server-side rendering (SSR)
  return (
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === 'production' ? 'http://api:4000/api' : 'http://localhost:4000/api')
  );
}

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dynamic request interceptor
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    config.baseURL = '/api';

    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Attach guest session ID
    let sessionId = localStorage.getItem('guest_session_id');
    if (!sessionId) {
      sessionId = 'guest_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('guest_session_id', sessionId);
    }
    config.headers['x-session-id'] = sessionId;
  }
  return config;
});

// Unwrap { success: true, data: ... } response interceptor
apiClient.interceptors.response.use(
  (response) => {
    if (response.data && response.data.success && response.data.data !== undefined) {
      return response.data.data;
    }
    return response.data;
  },
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An error occurred';
    return Promise.reject(new Error(typeof message === 'object' ? JSON.stringify(message) : message));
  },
);
