import { Button, Divider, Stack, Typography } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import GitHubIcon from '@mui/icons-material/GitHub';
import { authApi } from '../../api/auth';
import { useState } from 'react';

export function OAuthButtons() {
  const [isLoading, setIsLoading] = useState<'google' | 'github' | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading('google');
    try {
      const redirectUrl = await authApi.getGoogleAuthUrl();
      window.location.href = redirectUrl;
    } catch (error) {
      console.error('Failed to get Google auth URL:', error);
      setIsLoading(null);
    }
  };

  const handleGithubLogin = async () => {
    setIsLoading('github');
    try {
      const redirectUrl = await authApi.getGithubAuthUrl();
      window.location.href = redirectUrl;
    } catch (error) {
      console.error('Failed to get GitHub auth URL:', error);
      setIsLoading(null);
    }
  };

  return (
    <>
      <Divider sx={{ my: 3 }}>
        <Typography color="text.secondary" variant="body2">
          OR CONTINUE WITH
        </Typography>
      </Divider>

      <Stack direction="row" spacing={2}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<GoogleIcon />}
          onClick={handleGoogleLogin}
          disabled={!!isLoading}
        >
          Google
        </Button>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<GitHubIcon />}
          onClick={handleGithubLogin}
          disabled={!!isLoading}
        >
          GitHub
        </Button>
      </Stack>
    </>
  );
}
