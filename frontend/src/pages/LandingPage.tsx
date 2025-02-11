import { Box, Container, Typography, Button, Stack, Grid, Paper } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 4,
        }}
      >
        <Typography variant="h2" color="primary" gutterBottom>
          Secure Virtual Card Management for AI Agents
        </Typography>
        
        <Typography variant="h5" color="text.secondary" sx={{ maxWidth: 800 }}>
          Empower your AI agents with secure, programmable payment capabilities through our
          advanced virtual card platform.
        </Typography>

        {!isAuthenticated && (
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button
              component={RouterLink}
              to="/login"
              variant="contained"
              size="large"
              sx={{ px: 4 }}
            >
              Get Started
            </Button>
            <Button
              component={RouterLink}
              to="/register"
              variant="outlined"
              size="large"
              sx={{ px: 4 }}
            >
              Learn More
            </Button>
          </Stack>
        )}

        <Box sx={{ mt: 8 }}>
          <Typography variant="h4" gutterBottom>
            Key Features
          </Typography>
          <Grid container spacing={4} sx={{ mt: 2 }}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>🔒 Secure Management</Typography>
                <Typography variant="body1">
                  Enterprise-grade security for virtual card creation and management
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>📝 Template System</Typography>
                <Typography variant="body1">
                  Create and manage card templates for consistent configuration
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>📊 Real-time Monitoring</Typography>
                <Typography variant="body1">
                  Track transactions and card usage in real-time
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Container>
  );
}
