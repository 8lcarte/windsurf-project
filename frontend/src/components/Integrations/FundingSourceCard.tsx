import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  CardActionArea,
  Box,
  Button,
  Chip,
  SvgIcon,
} from '@mui/material';
import { Check as CheckIcon, Link as LinkIcon } from '@mui/icons-material';

interface FundingSourceCardProps {
  name: string;
  description: string;
  icon: React.ComponentType;
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  disabled?: boolean;
}

export const FundingSourceCard: React.FC<FundingSourceCardProps> = ({
  name,
  description,
  icon,
  connected,
  onConnect,
  onDisconnect,
  disabled = false,
}) => {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <Box
            sx={{
              backgroundColor: (theme) =>
                connected
                  ? theme.palette.success.main
                  : theme.palette.primary.main,
              borderRadius: '50%',
              p: 1.5,
              mr: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.3s ease',
            }}
          >
            <SvgIcon
              component={icon}
              sx={{ color: 'white', fontSize: '1.8rem' }}
            />
          </Box>
          <Box flexGrow={1}>
            <Typography variant="h6" component="div">
              {name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </Box>
          <Chip
            label={connected ? 'Connected' : 'Not Connected'}
            color={connected ? 'success' : 'default'}
            icon={connected ? <CheckIcon /> : <LinkIcon />}
            sx={{ ml: 2 }}
          />
        </Box>
        <Box display="flex" justifyContent="flex-end">
          <Button
            variant={connected ? 'outlined' : 'contained'}
            color={connected ? 'error' : 'primary'}
            onClick={connected ? onDisconnect : onConnect}
            startIcon={connected ? undefined : <LinkIcon />}
            disabled={disabled}
          >
            {connected ? 'Disconnect' : 'Connect'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
