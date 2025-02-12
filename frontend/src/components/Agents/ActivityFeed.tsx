import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineContent,
  TimelineSeparator,
  TimelineDot,
  TimelineConnector,
  TimelineOppositeContent,
} from '@mui/lab';
import {
  ShoppingCart as TransactionIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';

interface ActivityEvent {
  id: string;
  type: 'transaction' | 'risk_alert' | 'system' | 'error';
  title: string;
  description: string;
  status?: 'success' | 'warning' | 'error';
  metadata?: {
    amount?: number;
    merchant?: string;
    risk_level?: string;
    error_code?: string;
  };
  created_at: string;
}

export const ActivityFeed: React.FC<{ agentId?: string }> = ({ agentId }) => {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventType, setEventType] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchActivities();
    let interval: NodeJS.Timeout;

    if (autoRefresh) {
      interval = setInterval(fetchActivities, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [agentId, eventType, autoRefresh]);

  const fetchActivities = async () => {
    try {
      const url = new URL('/api/v1/activities', window.location.origin);
      if (agentId) url.searchParams.append('agent_id', agentId);
      if (eventType !== 'all') url.searchParams.append('type', eventType);

      const response = await fetch(url.toString());
      const data = await response.json();
      setActivities(data);
      setError(null);
    } catch (err) {
      setError('Failed to load activity feed');
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string, status?: string) => {
    switch (type) {
      case 'transaction':
        return <TransactionIcon />;
      case 'risk_alert':
        return <WarningIcon />;
      case 'error':
        return <ErrorIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const getEventColor = (type: string, status?: string) => {
    if (status === 'error') return 'error';
    if (status === 'warning') return 'warning';
    if (status === 'success') return 'success';
    
    switch (type) {
      case 'transaction':
        return 'primary';
      case 'risk_alert':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  };

  const formatEventTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      relative: formatDistanceToNow(date, { addSuffix: true }),
      absolute: format(date, 'MMM d, yyyy HH:mm:ss'),
    };
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Activity Feed</Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Event Type</InputLabel>
              <Select
                value={eventType}
                label="Event Type"
                onChange={(e) => setEventType(e.target.value)}
              >
                <MenuItem value="all">All Events</MenuItem>
                <MenuItem value="transaction">Transactions</MenuItem>
                <MenuItem value="risk_alert">Risk Alerts</MenuItem>
                <MenuItem value="system">System Events</MenuItem>
                <MenuItem value="error">Errors</MenuItem>
              </Select>
            </FormControl>
            <IconButton
              onClick={fetchActivities}
              color="primary"
              title={autoRefresh ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}
            >
              <RefreshIcon />
            </IconButton>
            <Button
              size="small"
              variant={autoRefresh ? 'contained' : 'outlined'}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'Auto-refresh On' : 'Auto-refresh Off'}
            </Button>
          </Box>
        </Box>

        <Timeline>
          {activities.map((activity) => (
            <TimelineItem key={activity.id}>
              <TimelineOppositeContent sx={{ flex: 0.2 }}>
                <Typography variant="caption" color="textSecondary" title={formatEventTime(activity.created_at).absolute}>
                  {formatEventTime(activity.created_at).relative}
                </Typography>
              </TimelineOppositeContent>
              <TimelineSeparator>
                <TimelineDot color={getEventColor(activity.type, activity.status)}>
                  {getEventIcon(activity.type, activity.status)}
                </TimelineDot>
                <TimelineConnector />
              </TimelineSeparator>
              <TimelineContent>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" component="span">
                    {activity.title}
                  </Typography>
                  {activity.status && (
                    <Chip
                      size="small"
                      label={activity.status}
                      color={getEventColor(activity.type, activity.status)}
                      sx={{ ml: 1 }}
                    />
                  )}
                </Box>
                <Typography variant="body2" color="textSecondary">
                  {activity.description}
                </Typography>
                {activity.metadata && (
                  <Box sx={{ mt: 1 }}>
                    {activity.metadata.amount && (
                      <Chip
                        size="small"
                        label={`$${activity.metadata.amount.toFixed(2)}`}
                        sx={{ mr: 1 }}
                      />
                    )}
                    {activity.metadata.merchant && (
                      <Chip
                        size="small"
                        label={activity.metadata.merchant}
                        sx={{ mr: 1 }}
                      />
                    )}
                    {activity.metadata.risk_level && (
                      <Chip
                        size="small"
                        label={`Risk: ${activity.metadata.risk_level}`}
                        color={activity.metadata.risk_level === 'high' ? 'error' : 'default'}
                        sx={{ mr: 1 }}
                      />
                    )}
                    {activity.metadata.error_code && (
                      <Chip
                        size="small"
                        label={`Error: ${activity.metadata.error_code}`}
                        color="error"
                      />
                    )}
                  </Box>
                )}
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>

        {activities.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="textSecondary">No activities found</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}; 