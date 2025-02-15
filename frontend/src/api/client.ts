import axios, { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from 'axios';
import { 
  setupCache, 
  AxiosCacheInstance, 
  buildMemoryStorage,
  CacheAxiosResponse,
  InternalCacheRequestConfig
} from 'axios-cache-interceptor';
import axiosRetry, { isNetworkOrIdempotentRequestError, IAxiosRetryConfig } from 'axios-retry';
import { log } from '../utils/environment';

// Types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Constants
export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api/v1';
const DEFAULT_TIMEOUT = 10000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Default headers
const defaultHeaders = new AxiosHeaders({
  'Content-Type': 'application/json'
});

// Create base client
const baseClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  headers: defaultHeaders
});

// Configure retries with exponential backoff
const retryConfig: IAxiosRetryConfig = {
  retries: MAX_RETRIES,
  retryDelay: (retryCount: number, error: AxiosError) => {
    // Handle rate limiting specially
    if (error.response?.status === 429) {
      const retryAfter = parseInt(error.response.headers['retry-after'] || '60', 10);
      return retryAfter * 1000;
    }
    // Exponential backoff
    return axiosRetry.exponentialDelay(retryCount);
  },
  retryCondition: (error: AxiosError): boolean => {
    // Retry on network errors and 5xx responses
    if (isNetworkOrIdempotentRequestError(error)) {
      return true;
    }
    // Retry on rate limits
    if (error.response?.status === 429) {
      return true;
    }
    return false;
  },
};

axiosRetry(baseClient, retryConfig);

// Non-cacheable paths
const NON_CACHEABLE_PATHS = [
  /\/auth\//,
  /\/transactions\//,
  /\/virtual-cards\//
];

// Add caching
export const client: AxiosCacheInstance = setupCache(baseClient, {
  storage: buildMemoryStorage(),
  ttl: CACHE_TTL,
  methods: ['get'],
  interpretHeader: false,
  cachePredicate: (response: CacheAxiosResponse) => {
    // Only cache successful GET requests
    if (response.status !== 200 || response.config.method?.toLowerCase() !== 'get') {
      return false;
    }

    // Don't cache excluded paths
    const path = response.config.url || '';
    return !NON_CACHEABLE_PATHS.some(pattern => pattern.test(path));
  }
});

// Request queue for managing concurrent requests
class RequestQueue {
  private queue: Map<string, Promise<any>> = new Map();

  async enqueue<T>(key: string, request: () => Promise<T>): Promise<T> {
    if (this.queue.has(key)) {
      return this.queue.get(key)!;
    }

    const promise = request().finally(() => {
      this.queue.delete(key);
    });

    this.queue.set(key, promise);
    return promise;
  }
}

const requestQueue = new RequestQueue();

// Token management
interface TokenStorage {
  getToken: () => string | null;
  setToken: (token: string) => void;
  removeToken: () => void;
}

const tokenStorage: TokenStorage = {
  getToken: () => {
    try {
      return localStorage.getItem('token');
    } catch (e) {
      log('error', 'Failed to access token storage', e);
      return null;
    }
  },
  
  setToken: (token: string) => {
    try {
      localStorage.setItem('token', token);
    } catch (e) {
      log('error', 'Failed to store token', e);
    }
  },
  
  removeToken: () => {
    try {
      localStorage.removeItem('token');
    } catch (e) {
      log('error', 'Failed to remove token', e);
    }
  }
};

// Request interceptor
client.interceptors.request.use(
  async (config: InternalCacheRequestConfig): Promise<InternalCacheRequestConfig> => {
    const token = tokenStorage.getToken();
    const headers = new AxiosHeaders(config.headers || {});

    headers.set('X-Request-ID', crypto.randomUUID());
    if (token) {
      headers.set('Authorization', `Bearer ${token.trim()}`);
    }

    // Log request
    log('debug', 'API Request', {
      method: config.method,
      url: config.url,
      requestId: headers.get('X-Request-ID')
    });

    return { ...config, headers };
  },
  (error: Error) => {
    log('error', 'Request preparation failed', error);
    return Promise.reject(error);
  }
);

// Response interceptor
client.interceptors.response.use(
  (response: CacheAxiosResponse) => {
    // Log response
    log('debug', 'API Response', {
      status: response.status,
      url: response.config.url,
      requestId: response.config.headers['X-Request-ID'],
      cached: response.cached || false
    });

    return response;
  },
  async (error: AxiosError<{ code?: string; message?: string; details?: Record<string, any> }>) => {
    // Log error
    log('error', 'API Error', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message,
      requestId: error.config?.headers['X-Request-ID']
    });

    // Handle authentication errors
    if (error.response?.status === 401) {
      tokenStorage.removeToken();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Handle rate limiting
    if (error.response?.status === 429) {
      const retryAfter = parseInt(error.response.headers['retry-after'] || '60', 10);
      error.message = `Rate limit exceeded. Please try again in ${retryAfter} seconds.`;
    }

    // Format error for consistent handling
    const apiError: ApiError = {
      code: error.response?.data?.code || 'UNKNOWN_ERROR',
      message: error.response?.data?.message || error.message,
      details: error.response?.data?.details
    };

    return Promise.reject(apiError);
  }
);

// Helper to ensure headers are properly initialized
function ensureHeaders(config?: Partial<InternalAxiosRequestConfig>): InternalAxiosRequestConfig {
  return {
    ...config,
    headers: new AxiosHeaders(config?.headers || defaultHeaders)
  } as InternalAxiosRequestConfig;
}

// API request wrapper with queue support
export async function makeRequest<T>(
  config: Partial<InternalAxiosRequestConfig>,
  queueKey?: string
): Promise<T> {
  const request = async () => {
    const response = await client.request<ApiResponse<T>>(ensureHeaders(config));
    return response.data.data;
  };

  if (queueKey) {
    return requestQueue.enqueue<T>(queueKey, request);
  }

  return request();
}

// Utility functions
export function isCancelError(error: unknown): boolean {
  return axios.isCancel(error);
}

export function createCancelToken() {
  return axios.CancelToken.source();
}

// Type-safe request helpers
export async function get<T>(
  url: string, 
  config?: Partial<Omit<InternalAxiosRequestConfig, 'url' | 'method'>>
): Promise<T> {
  return makeRequest<T>(ensureHeaders({ ...config, method: 'get', url }));
}

export async function post<T>(
  url: string,
  data?: unknown,
  config?: Partial<Omit<InternalAxiosRequestConfig, 'url' | 'method' | 'data'>>
): Promise<T> {
  return makeRequest<T>(ensureHeaders({ ...config, method: 'post', url, data }));
}

export async function put<T>(
  url: string,
  data?: unknown,
  config?: Partial<Omit<InternalAxiosRequestConfig, 'url' | 'method' | 'data'>>
): Promise<T> {
  return makeRequest<T>(ensureHeaders({ ...config, method: 'put', url, data }));
}

export async function patch<T>(
  url: string,
  data?: unknown,
  config?: Partial<Omit<InternalAxiosRequestConfig, 'url' | 'method' | 'data'>>
): Promise<T> {
  return makeRequest<T>(ensureHeaders({ ...config, method: 'patch', url, data }));
}

export async function del<T>(
  url: string, 
  config?: Partial<Omit<InternalAxiosRequestConfig, 'url' | 'method'>>
): Promise<T> {
  return makeRequest<T>(ensureHeaders({ ...config, method: 'delete', url }));
}
