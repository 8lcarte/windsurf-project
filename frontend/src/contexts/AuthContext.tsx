import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { authApi } from '../api/auth';

interface User {
  id: string;
  email: string;
  fullName: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const storage = {
  getToken: () => {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem('token');
    } catch (e) {
      console.warn('Failed to access localStorage');
      return null;
    }
  },
  setToken: (token: string) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('token', token);
    } catch (e) {
      console.warn('Failed to access localStorage');
    }
  },
  removeToken: () => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem('token');
    } catch (e) {
      console.warn('Failed to access localStorage');
    }
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const isAuthenticated = !!user;

  // Check for existing token and fetch user data on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = storage.getToken();
      if (token) {
        try {
          const data = await authApi.getCurrentUser();
          setUser(data.user);
        } catch (error) {
          console.error('Failed to fetch user:', error);
          storage.removeToken();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const data = await authApi.login({ email, password });
      storage.setToken(data.token);
      setUser(data.user);
      navigate('/dashboard');
      enqueueSnackbar('Successfully logged in!', { variant: 'success' });
    } catch (error) {
      console.error('Login failed:', error);
      enqueueSnackbar('Login failed. Please check your credentials.', { variant: 'error' });
      throw error;
    }
  };

  const register = async (fullName: string, email: string, password: string) => {
    try {
      const data = await authApi.register({ fullName, email, password });
      storage.setToken(data.token);
      setUser(data.user);
      navigate('/dashboard');
      enqueueSnackbar('Successfully registered!', { variant: 'success' });
    } catch (error) {
      console.error('Registration failed:', error);
      enqueueSnackbar('Registration failed. Please try again.', { variant: 'error' });
      throw error;
    }
  };

  const logout = () => {
    storage.removeToken();
    setUser(null);
    navigate('/');
    enqueueSnackbar('Successfully logged out!', { variant: 'success' });
  };

  if (isLoading) {
    return null; // or a loading spinner
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, register, logout }}>
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
