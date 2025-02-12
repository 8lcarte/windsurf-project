import axios from 'axios';

// Keep track of if we're already redirecting to prevent loops
let isRedirecting = false;

// Memory fallback for token storage
let memoryToken: string | null = null;

const getToken = () => {
  try {
    if (typeof window === 'undefined') return null;
    // Try localStorage first
    const token = window.localStorage.getItem('token');
    if (token) {
      console.debug('API: Found token in localStorage');
      return token;
    }
    // Try memory fallback
    if (memoryToken) {
      console.debug('API: Found token in memory fallback');
      return memoryToken;
    }
    console.debug('API: No token found');
    return null;
  } catch (e) {
    console.warn('API: Failed to access storage:', e);
    return memoryToken;
  }
};

export const api = axios.create({
  baseURL: '/api/v1',  // Match the backend API prefix
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,  // Required for CORS with credentials
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  async (config) => {
    const token = getToken();
    console.debug('API Request:', {
      url: config.url,
      method: config.method,
      hasToken: !!token
    });

    if (token) {
      const cleanToken = token.trim();
      config.headers.Authorization = `Bearer ${cleanToken}`;
      console.debug('API: Added token to request headers');
    }
    
    return config;
  },
  (error) => {
    console.error('API Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    console.debug('API Response:', {
      url: response.config.url,
      status: response.status,
      hasData: !!response.data
    });
    return response;
  },
  (error) => {
    console.error('API Response error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message
    });

    if (error.response?.status === 401 && !isRedirecting) {
      console.debug('API: Unauthorized access, clearing token and redirecting');
      isRedirecting = true;
      
      // Clear token from all storage
      try {
        localStorage.removeItem('token');
        memoryToken = null;
      } catch (e) {
        console.warn('API: Failed to clear token:', e);
      }

      window.location.href = '/login';
      
      // Reset the flag after a short delay
      setTimeout(() => {
        isRedirecting = false;
      }, 1000);
    }
    return Promise.reject(error);
  }
);
