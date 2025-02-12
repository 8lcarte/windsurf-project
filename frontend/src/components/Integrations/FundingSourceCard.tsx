import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  SvgIcon,
  CircularProgress,
  Tooltip,
  IconButton,
  Collapse,
  Alert,
} from '@mui/material';
import {
  Check as CheckIcon,
  Link as LinkIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

interface FundingSourceCardProps {
  name: string;
  description: string;
  icon: React.ComponentType;
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  isPolling?: boolean;
  error?: {
    message: string;
    code?: string;
  } | null;
  onRetry?: () => void;
}

export const FundingSourceCard: React.FC<FundingSourceCardProps> = ({
  name,
  description,
  icon,
  connected,
  onConnect,
  onDisconnect,
  disabled = false,
  isLoading = false,
  isPolling = false,
  error = null,
  onRetry,
}) => {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Header */}
        <Box display="flex" alignItems="center" mb={2}>
          <Box
            sx={{
              backgroundColor: (theme) =>
                error
                  ? theme.palette.error.main
                  : connected
                  ? theme.palette.success.main
                  : theme.palette.primary.main,
              borderRadius: '50%',
              p: 1.5,
              mr: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              position: 'relative',
            }}
          >
            {isLoading || isPolling ? (
              <CircularProgress
                size={24}
                sx={{
                  position: 'absolute',
                  color: 'white',
                }}
              />
            ) : null}
            <SvgIcon
              component={icon}
              sx={{
                color: 'white',
                fontSize: '1.8rem',
                opacity: isLoading || isPolling ? 0.5 : 1,
              }}
            />
          </Box>
          <Box flexGrow={1}>
            <Typography variant="h6" component="div" gutterBottom>
              {name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </Box>
          <Box>
            <Chip
              label={isPolling ? 'Connecting...' : connected ? 'Connected' : 'Not Connected'}
              color={error ? 'error' : connected ? 'success' : 'default'}
              icon={error ? <ErrorIcon /> : connected ? <CheckIcon /> : <LinkIcon />}
              sx={{ ml: 2 }}
            />
          </Box>
        </Box>

        {/* Error Message */}
        <Collapse in={!!error} sx={{ mb: error ? 2 : 0 }}>
          <Alert
            severity="error"
            action={
              <>
                {onRetry && (
                  <Tooltip title="Retry">
                    <IconButton
                      color="inherit"
                      size="small"
                      onClick={onRetry}
                    >
                      <RefreshIcon fontSize="inherit" />
                    </IconButton>
                  </Tooltip>
                )}
                <IconButton
                  color="inherit"
                  size="small"
                  onClick={() => error = null}
                >
                  <CloseIcon fontSize="inherit" />
                </IconButton>
              </>
            }
          >
            {error?.message}
          </Alert>
        </Collapse>

        {/* Actions */}
        <Box display="flex" justifyContent="flex-end">
          <Button
            variant={connected ? 'outlined' : 'contained'}
            color={connected ? 'error' : 'primary'}
            onClick={connected ? onDisconnect : onConnect}
            startIcon={
              isLoading || isPolling ? (
                <CircularProgress size={16} />
              ) : connected ? (
                undefined
              ) : (
                <LinkIcon />
              )
            }
            disabled={disabled || isLoading || isPolling}
          >
            {isPolling
              ? 'Connecting...'
              : isLoading
              ? 'Loading...'
              : connected
              ? 'Disconnect'
              : 'Connect'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
