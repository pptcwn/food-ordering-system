import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token from localStorage if available
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
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
