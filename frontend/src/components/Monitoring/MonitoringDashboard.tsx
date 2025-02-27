import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Button,
  Alert,
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useSnackbar } from 'notistack';
import axios from 'axios';

interface MetricsData {
  active_agents: number;
  total_transactions: number;
  success_rate: number;
  average_response_time: number;
  risk_distribution: {
    low: number;
    medium: number;
    high: number;
  };
  top_merchants: Array<{
    name: string;
    transaction_count: number;
  }>;
  recent_anomalies: Array<{
    id: number;
    agent_id: number;
    type: string;
    severity: string;
    detected_at: string;
    description: string;
  }>;
}

interface Alert {
  id: number;
  type: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  created_at: string;
  status: string;
}

interface TimeSeriesData {
  transaction_volume: Array<{
    timestamp: string;
    value: number;
  }>;
  average_risk_score: Array<{
    timestamp: string;
    value: number;
  }>;
}

export const MonitoringDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState('24h');
  const [alertFilter, setAlertFilter] = useState('all');
  const { enqueueSnackbar } = useSnackbar();

  const { data: metrics, isLoading: metricsLoading, error: metricsError, refetch: refetchMetrics } = useQuery<MetricsData>({
    queryKey: ['monitoring', 'metrics'],
    queryFn: async () => {
      const response = await axios.get<{ success: boolean; data: MetricsData }>('/v1/monitoring/metrics');
      return response.data.data;
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery<Alert[]>({
    queryKey: ['monitoring', 'alerts'],
    queryFn: async () => {
      const response = await axios.get<{ success: boolean; data: Alert[] }>('/v1/monitoring/alerts');
      return response.data.data;
    },
    refetchInterval: 30000
  });

  const { data: timeSeriesData, isLoading: timeSeriesLoading } = useQuery<TimeSeriesData>({
    queryKey: ['monitoring', 'timeseries', timeRange],
    queryFn: async () => {
      const response = await axios.get<{ success: boolean; data: TimeSeriesData }>(`/v1/monitoring/timeseries?range=${timeRange}`);
      return response.data.data;
    }
  });

  const handleAcknowledgeAlert = async (alertId: number) => {
    try {
      await axios.post(`/v1/monitoring/alerts/${alertId}/acknowledge`);
      enqueueSnackbar('Alert acknowledged', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Failed to acknowledge alert', { variant: 'error' });
    }
  };

  if (metricsLoading || alertsLoading || timeSeriesLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (metricsError) {
    return (
      <Box p={3}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={() => refetchMetrics()}>
              Retry
            </Button>
          }
        >
          Error loading metrics
        </Alert>
      </Box>
    );
  }

  const filteredAlerts = alerts?.filter(alert => 
    alertFilter === 'all' || alert.severity === alertFilter
  ) ?? [];

  const formatMetricValue = (value: number | undefined, format: 'number' | 'percentage' | 'time' = 'number'): string => {
    if (value === undefined) return '-';
    switch (format) {
      case 'percentage':
        return `${(value * 100).toFixed(0)}%`;
      case 'time':
        return `${value.toFixed(2)}s`;
      default:
        return value.toString();
    }
  };

  return (
    <Box p={3}>
      <Grid container spacing={3}>
        {/* Metrics Overview */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Overview</Typography>
              <Grid container spacing={2}>
                <Grid item xs={3}>
                  <Typography variant="body2" color="textSecondary">Active Agents</Typography>
                  <Typography variant="h6">{formatMetricValue(metrics?.active_agents)}</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2" color="textSecondary">Success Rate</Typography>
                  <Typography variant="h6">{formatMetricValue(metrics?.success_rate, 'percentage')}</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2" color="textSecondary">Total Transactions</Typography>
                  <Typography variant="h6">{formatMetricValue(metrics?.total_transactions)}</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2" color="textSecondary">Avg Response Time</Typography>
                  <Typography variant="h6">{formatMetricValue(metrics?.average_response_time, 'time')}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Time Series Charts */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Transaction Volume</Typography>
                <FormControl size="small">
                  <InputLabel>Time Range</InputLabel>
                  <Select
                    value={timeRange}
                    label="Time Range"
                    onChange={(e) => setTimeRange(e.target.value)}
                  >
                    <MenuItem value="24h">Last 24 Hours</MenuItem>
                    <MenuItem value="7d">Last 7 Days</MenuItem>
                    <MenuItem value="30d">Last 30 Days</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box height={300} data-testid="transaction-volume-chart" data-point-count={timeSeriesData?.transaction_volume.length ?? 0}>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={timeSeriesData?.transaction_volume ?? []}>
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Risk Score Chart */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Risk Score Trend</Typography>
              <Box height={300} data-testid="risk-score-chart">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={timeSeriesData?.average_risk_score ?? []}>
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#82ca9d" />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Alerts */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Active Alerts</Typography>
                <FormControl size="small">
                  <InputLabel>Filter Alerts</InputLabel>
                  <Select
                    value={alertFilter}
                    label="Filter Alerts"
                    onChange={(e) => setAlertFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Severities</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              {filteredAlerts.map((alert) => (
                <Box key={alert.id} mb={2} p={2} bgcolor="background.paper" borderRadius={1}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="subtitle1">{alert.message}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {new Date(alert.created_at).toLocaleString()}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip
                        label={alert.severity}
                        color={
                          alert.severity === 'high' ? 'error' :
                          alert.severity === 'medium' ? 'warning' : 'success'
                        }
                        size="small"
                      />
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleAcknowledgeAlert(alert.id)}
                      >
                        Acknowledge
                      </Button>
                    </Box>
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Top Merchants */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Top Merchants</Typography>
              {metrics?.top_merchants?.map((merchant) => (
                <Box key={merchant.name} display="flex" justifyContent="space-between" mb={1}>
                  <Typography>{merchant.name} ({merchant.transaction_count})</Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};