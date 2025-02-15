import axios, { AxiosError } from 'axios';
import { isProduction } from '../utils/environment';

// API configuration
const API_CONFIG = {
  PROD_URL: 'https://api.windsurf.com/v1', // Replace with actual production API URL
  DEV_URL: 'http://localhost:3001/v1',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

// Token management
let memoryToken: string | null = null;
let isRedirecting = false;

const getToken = (): string | null => {
  try {
    if (typeof window === 'undefined') return null;
    
    // Try localStorage first
    const token = window.localStorage.getItem('token');
    if (token) {
      return token.trim();
    }
    
    // Fallback to memory storage
    return memoryToken;
  } catch (e) {
    console.warn('Storage access failed:', e);
    return memoryToken;
  }
};

const clearToken = (): void => {
  try {
    localStorage.removeItem('token');
    memoryToken = null;
  } catch (e) {
    console.warn('Failed to clear token:', e);
  }
};

// Create axios instance
export const api = axios.create({
  baseURL: isProduction ? API_CONFIG.PROD_URL : API_CONFIG.DEV_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request ID for tracking
    config.headers['X-Request-ID'] = crypto.randomUUID();
    
    if (process.env.NODE_ENV === 'development') {
      console.debug('API Request:', {
        url: config.url,
        method: config.method,
        hasToken: !!token,
        requestId: config.headers['X-Request-ID']
      });
    }
    
    return config;
  },
  (error) => {
    console.error('Request preparation failed:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with retry logic
api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('API Response:', {
        url: response.config.url,
        status: response.status,
        requestId: response.config.headers['X-Request-ID']
      });
    }
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config;
    
    // Add retry attempt counter if not present
    if (!config) return Promise.reject(error);
    (config as any).retryCount = (config as any).retryCount || 0;

    // Handle authentication errors
    if (error.response?.status === 401 && !isRedirecting) {
      isRedirecting = true;
      clearToken();
      window.location.href = '/login';
      setTimeout(() => { isRedirecting = false; }, 1000);
      return Promise.reject(error);
    }

    // Retry logic for specific errors
    const shouldRetry = (
      (error.response?.status === 408 || error.response?.status === 429 || error.code === 'ECONNABORTED') &&
      (config as any).retryCount < API_CONFIG.RETRY_ATTEMPTS
    );

    if (shouldRetry) {
      (config as any).retryCount += 1;

      // Exponential backoff
      const delay = API_CONFIG.RETRY_DELAY * Math.pow(2, (config as any).retryCount - 1);
      await new Promise(resolve => setTimeout(resolve, delay));

      console.warn(`Retrying request (${(config as any).retryCount}/${API_CONFIG.RETRY_ATTEMPTS}):`, {
        url: config.url,
        method: config.method,
        requestId: config.headers['X-Request-ID']
      });

      return api(config);
    }

    // Log detailed error information in development
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', {
        url: config.url,
        method: config.method,
        status: error.response?.status,
        message: error.message,
        requestId: config.headers['X-Request-ID'],
        retryCount: (config as any).retryCount
      });
    }

    return Promise.reject(error);
  }
);

// Error handling utilities
export const isNetworkError = (error: any): boolean => {
  return !error.response && !!error.isAxiosError;
};

export const isRateLimitError = (error: any): boolean => {
  return error.response?.status === 429;
};

export const getErrorMessage = (error: any): string => {
  if (isNetworkError(error)) {
    return 'Network error. Please check your connection.';
  }
  
  if (isRateLimitError(error)) {
    return 'Too many requests. Please try again later.';
  }
  
  return error.response?.data?.message || error.message || 'An unexpected error occurred.';
};
