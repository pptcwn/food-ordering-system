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

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${getApiBaseUrl()}/auth/refresh`, { refreshToken }, {
        headers: { 'Content-Type': 'application/json' },
      })
      .then((response) => {
        const payload = response.data?.success && response.data?.data !== undefined
          ? response.data.data
          : response.data;
        const nextAccessToken = payload?.accessToken;
        const nextRefreshToken = payload?.refreshToken;
        if (!nextAccessToken) {
          throw new Error('Missing refreshed access token');
        }
        localStorage.setItem('access_token', nextAccessToken);
        if (nextRefreshToken) {
          localStorage.setItem('refresh_token', nextRefreshToken);
        }
        return nextAccessToken as string;
      })
      .catch(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('admin_user');
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

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
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const rawMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      '';
    const normalizedMessage = typeof rawMessage === 'string' ? rawMessage : JSON.stringify(rawMessage);

    if (
      typeof window !== 'undefined' &&
      originalRequest &&
      !originalRequest._retry &&
      !String(originalRequest.url || '').includes('/auth/refresh') &&
      (status === 401 || /authentication required|unauthorized|jwt expired|invalid or expired refresh token/i.test(normalizedMessage))
    ) {
      originalRequest._retry = true;
      const nextAccessToken = await refreshAccessToken();
      if (nextAccessToken) {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
        return apiClient(originalRequest);
      }
    }

    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An error occurred';
    return Promise.reject(new Error(typeof message === 'object' ? JSON.stringify(message) : message));
  },
);
