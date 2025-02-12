import { AppBar, Box, Button, Container, Toolbar, Typography, CircularProgress } from '@mui/material';
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function AppLayout() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const location = useLocation();

  // Don't show the AppBar on login and register pages
  const isAuthPage = ['/login', '/register'].includes(location.pathname);

  if (isLoading) {
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
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!isAuthPage && (
        <AppBar position="sticky">
          <Toolbar>
            <Typography
              variant="h6"
              component={RouterLink}
              to="/"
              sx={{
                textDecoration: 'none',
                color: 'inherit',
                flexGrow: 1,
              }}
            >
              AI Agent Payment Platform
            </Typography>

            <Box sx={{ display: 'flex', gap: 2 }}>
              {isAuthenticated ? (
                <>
                  <Button
                    color="inherit"
                    component={RouterLink}
                    to="/dashboard"
                  >
                    Dashboard
                  </Button>
                  <Button
                    color="inherit"
                    onClick={logout}
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    color="inherit"
                    component={RouterLink}
                    to="/login"
                  >
                    Login
                  </Button>
                  <Button
                    color="inherit"
                    component={RouterLink}
                    to="/register"
                  >
                    Register
                  </Button>
                </>
              )}
            </Box>
          </Toolbar>
        </AppBar>
      )}

      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default' }}>
        <Outlet />
      </Box>
    </Box>
  );
}
