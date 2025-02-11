import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Container, Typography } from '@mui/material';
import { authApi } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';

export function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const provider = searchParams.get('provider') as 'google' | 'github';
      const error = searchParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        enqueueSnackbar('Authentication failed. Please try again.', { variant: 'error' });
        navigate('/login');
        return;
      }

      if (!code || !provider) {
        enqueueSnackbar('Invalid authentication response', { variant: 'error' });
        navigate('/login');
        return;
      }

      try {
        const data = await authApi.handleOAuthCallback(provider, code);
        localStorage.setItem('token', data.token);
        enqueueSnackbar('Successfully logged in!', { variant: 'success' });
        navigate('/dashboard');
      } catch (error) {
        console.error('Failed to complete authentication:', error);
        enqueueSnackbar('Authentication failed. Please try again.', { variant: 'error' });
        navigate('/login');
      }
    };

    handleCallback();
  }, [searchParams, navigate, enqueueSnackbar]);

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Box sx={{ textAlign: 'center' }}>
        <CircularProgress size={48} sx={{ mb: 3 }} />
        <Typography variant="h6" gutterBottom>
          Completing authentication...
        </Typography>
        <Typography color="text.secondary">
          Please wait while we finish setting up your account.
        </Typography>
      </Box>
    </Container>
  );
}
