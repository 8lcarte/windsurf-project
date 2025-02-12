import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { authApi } from '../api/auth';
import { Box, CircularProgress } from '@mui/material';

interface User {
  id: string;
  email: string;
  fullName: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  getAccessToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Memory fallback for token storage
let memoryToken: string | null = null;

const storage = {
  getToken: () => {
    try {
      if (typeof window === 'undefined') return null;
      // Try localStorage first
      const token = window.localStorage.getItem('token');
      if (token) {
        console.debug('Storage: Found token in localStorage');
        return token;
      }
      // Fallback to memory storage
      if (memoryToken) {
        console.debug('Storage: Found token in memory fallback');
        return memoryToken;
      }
      return null;
    } catch (e) {
      console.warn('Storage: Failed to access localStorage:', e);
      // Return memory fallback if available
      return memoryToken;
    }
  },
  setToken: (token: string) => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem('token', token);
      console.debug('Storage: Token stored in localStorage');
    } catch (e) {
      console.warn('Storage: Failed to store in localStorage, using memory fallback:', e);
      memoryToken = token;
    }
  },
  removeToken: () => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.removeItem('token');
      memoryToken = null;
      console.debug('Storage: Token removed from all storage');
    } catch (e) {
      console.warn('Storage: Failed to remove from localStorage:', e);
      memoryToken = null;
    }
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    const token = storage.getToken();
    console.debug('Initial token load:', token ? 'Token found' : 'No token');
    return token;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const isAuthenticated = !!user;

  // Check for existing token and fetch user data on mount
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        if (!accessToken) {
          if (mounted) {
            setIsLoading(false);
            setIsInitialized(true);
          }
          return;
        }

        const { user } = await authApi.getCurrentUser();
        if (mounted) {
          setUser(user);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
        storage.removeToken();
        if (mounted) {
          setUser(null);
          setAccessToken(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, [accessToken]);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { token, user } = await authApi.login({ email, password });
      const cleanToken = token.trim();
      console.debug('Login: Storing token:', cleanToken);
      storage.setToken(cleanToken);
      setUser(user);
      setAccessToken(cleanToken);
      navigate('/dashboard');
      enqueueSnackbar('Successfully logged in!', { variant: 'success' });
    } catch (error) {
      console.error('Login failed:', error);
      storage.removeToken();
      setUser(null);
      setAccessToken(null);
      enqueueSnackbar('Login failed. Please check your credentials.', { variant: 'error' });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (fullName: string, email: string, password: string) => {
    try {
      setIsLoading(true);
      const { token, user } = await authApi.register({ fullName, email, password });
      const cleanToken = token.trim();
      console.debug('Register: Storing token:', cleanToken);
      storage.setToken(cleanToken);
      setUser(user);
      setAccessToken(cleanToken);
      navigate('/dashboard');
      enqueueSnackbar('Successfully registered!', { variant: 'success' });
    } catch (error) {
      console.error('Registration failed:', error);
      storage.removeToken();
      setUser(null);
      setAccessToken(null);
      enqueueSnackbar('Registration failed. Please try again.', { variant: 'error' });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    console.debug('Logout: Removing token');
    storage.removeToken();
    setUser(null);
    setAccessToken(null);
    navigate('/');
    enqueueSnackbar('Successfully logged out!', { variant: 'success' });
  };

  const getAccessToken = async () => {
    if (!accessToken) {
      console.debug('getAccessToken: No token available');
      throw new Error('No access token available');
    }
    console.debug('getAccessToken: Returning token:', accessToken);
    return accessToken;
  };

  // Don't render anything until auth is initialized
  if (!isInitialized) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoading, 
      isInitialized,
      login, 
      register, 
      logout, 
      getAccessToken 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
