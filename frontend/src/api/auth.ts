import { api } from './api';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData extends LoginCredentials {
  fullName: string;
}

interface User {
  id: string;
  email: string;
  fullName: string;
}

interface AuthResponse {
  token: string;
  user: User;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface OAuthResponse {
  redirectUrl: string;
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/api/v1/auth/login', credentials);
    return response.data.data;
  },

  register: async (userData: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/api/v1/auth/register', userData);
    return response.data.data;
  },

  getCurrentUser: async (): Promise<{ user: User }> => {
    const response = await api.get<ApiResponse<{ user: User }>>('/api/v1/auth/me');
    return response.data.data;
  },

  // OAuth endpoints
  getGoogleAuthUrl: async () => {
    const { data } = await api.get<ApiResponse<OAuthResponse>>('/api/v1/auth/google/url');
    return data.data.redirectUrl;
  },

  getGithubAuthUrl: async () => {
    const { data } = await api.get<ApiResponse<OAuthResponse>>('/api/v1/auth/github/url');
    return data.data.redirectUrl;
  },

  handleOAuthCallback: async (provider: 'google' | 'github', code: string) => {
    const { data } = await api.post<ApiResponse<AuthResponse>>(`/api/v1/auth/${provider}/callback`, { code });
    return data.data;
  },
};
