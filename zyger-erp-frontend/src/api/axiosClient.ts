import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('zyger-access-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;

    if (error.response?.status === 401 && config && !config.url?.includes('/auth/')) {
      sessionStorage.removeItem('zyger-access-token');
      sessionStorage.removeItem('zyger-user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
      return Promise.reject(new Error('Session expired. Please sign in again.'));
    }

    if (error.response?.status === 403) {
      return Promise.reject(new Error("You don't have permission for this action."));
    }

    if (config && !error.response?.status?.toString().startsWith('4')) {
      const retries = config._retryCount ?? 0;
      if (retries < MAX_RETRIES) {
        config._retryCount = retries + 1;
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (retries + 1)));
        return apiClient(config);
      }
    }

    if (error.response) {
      const data = error.response.data as Record<string, unknown> | undefined;
      const message = (data?.message as string) || 'An unexpected error occurred.';
      return Promise.reject(new Error(message));
    }
    return Promise.reject(new Error('Network Error. Please check your connection.'));
  }
);

export default apiClient;
