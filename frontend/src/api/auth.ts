import { api } from './api';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData extends LoginCredentials {
  fullName: string;
}

interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    user: {
      id: string;
      email: string;
      fullName: string;
    };
  };
}

interface OAuthResponse {
  redirectUrl: string;
}

export const authApi = {
  login: async (credentials: LoginCredentials) => {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    return response.data.data;
  },

  register: async (userData: RegisterData) => {
    const response = await api.post<AuthResponse>('/auth/register', userData);
    return response.data.data;
  },

  getCurrentUser: async () => {
    const response = await api.get<AuthResponse>('/auth/me');
    return response.data.data;
  },

  // OAuth endpoints
  getGoogleAuthUrl: async () => {
    const { data } = await api.get<OAuthResponse>('/auth/google/url');
    return data.redirectUrl;
  },

  getGithubAuthUrl: async () => {
    const { data } = await api.get<OAuthResponse>('/auth/github/url');
    return data.redirectUrl;
  },

  handleOAuthCallback: async (provider: 'google' | 'github', code: string) => {
    const { data } = await client.post<AuthResponse>(`/auth/${provider}/callback`, { code });
    return data;
  },
};
