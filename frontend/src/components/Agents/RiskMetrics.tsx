import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  LinearProgress,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

interface RiskMetricsData {
  overall_risk_score: number;
  risk_factors: {
    transaction_velocity: number;
    amount_volatility: number;
    merchant_risk: number;
    time_pattern_risk: number;
    geographic_risk: number;
  };
  recent_alerts: Array<{
    id: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    created_at: string;
  }>;
  risk_trends: {
    daily_scores: Array<{
      date: string;
      score: number;
    }>;
    weekly_summary: {
      average_score: number;
      trend_direction: 'up' | 'down' | 'stable';
      percent_change: number;
    };
  };
}

const RiskLevelColors = {
  low: '#4caf50',
  medium: '#ff9800',
  high: '#f44336',
  critical: '#d32f2f',
};

const getRiskColor = (score: number) => {
  if (score <= 0.25) return RiskLevelColors.low;
  if (score <= 0.5) return RiskLevelColors.medium;
  if (score <= 0.75) return RiskLevelColors.high;
  return RiskLevelColors.critical;
};

const getRiskLabel = (score: number) => {
  if (score <= 0.25) return 'Low';
  if (score <= 0.5) return 'Medium';
  if (score <= 0.75) return 'High';
  return 'Critical';
};

export const RiskMetrics: React.FC<{ agentId: string }> = ({ agentId }) => {
  const [metrics, setMetrics] = useState<RiskMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRiskMetrics();
  }, [agentId]);

  const fetchRiskMetrics = async () => {
    try {
      const response = await fetch(`/api/v1/agents/${agentId}/risk-metrics`);
      const data = await response.json();
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError('Failed to load risk metrics');
      console.error('Error fetching risk metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!metrics) return <Alert severity="error">Risk metrics not available</Alert>;

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Overall Risk Score */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Overall Risk Score</Typography>
                <Chip
                  label={getRiskLabel(metrics.overall_risk_score)}
                  sx={{
                    bgcolor: getRiskColor(metrics.overall_risk_score),
                    color: 'white',
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Box sx={{ flexGrow: 1, mr: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={metrics.overall_risk_score * 100}
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: getRiskColor(metrics.overall_risk_score),
                      },
                    }}
                  />
                </Box>
                <Typography variant="body2" color="textSecondary">
                  {(metrics.overall_risk_score * 100).toFixed(1)}%
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {metrics.risk_trends.weekly_summary.trend_direction !== 'stable' && (
                  <>
                    {metrics.risk_trends.weekly_summary.trend_direction === 'up' ? (
                      <TrendingUpIcon color="error" />
                    ) : (
                      <TrendingDownIcon color="success" />
                    )}
                    <Typography variant="body2" color="textSecondary">
                      {metrics.risk_trends.weekly_summary.percent_change}% from last week
                    </Typography>
                  </>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Risk Factors */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Risk Factors
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    {Object.entries(metrics.risk_factors).map(([factor, score]) => (
                      <TableRow key={factor}>
                        <TableCell>
                          <Typography variant="body2">
                            {factor.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ flexGrow: 1, mr: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={score * 100}
                                sx={{
                                  height: 6,
                                  borderRadius: 3,
                                  bgcolor: 'grey.200',
                                  '& .MuiLinearProgress-bar': {
                                    bgcolor: getRiskColor(score),
                                  },
                                }}
                              />
                            </Box>
                            <Typography variant="body2" color="textSecondary">
                              {(score * 100).toFixed(0)}%
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Alerts */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Risk Alerts
              </Typography>
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                {metrics.recent_alerts.map((alert) => (
                  <Box
                    key={alert.id}
                    sx={{
                      p: 2,
                      mb: 1,
                      borderRadius: 1,
                      bgcolor: 'grey.50',
                      border: 1,
                      borderColor: 'grey.200',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <WarningIcon
                        sx={{
                          mr: 1,
                          color: getRiskColor(
                            alert.severity === 'critical'
                              ? 1
                              : alert.severity === 'high'
                              ? 0.8
                              : alert.severity === 'medium'
                              ? 0.5
                              : 0.2
                          ),
                        }}
                      />
                      <Typography variant="subtitle2">{alert.type}</Typography>
                      <Chip
                        size="small"
                        label={alert.severity}
                        sx={{
                          ml: 1,
                          bgcolor: getRiskColor(
                            alert.severity === 'critical'
                              ? 1
                              : alert.severity === 'high'
                              ? 0.8
                              : alert.severity === 'medium'
                              ? 0.5
                              : 0.2
                          ),
                          color: 'white',
                        }}
                      />
                    </Box>
                    <Typography variant="body2" color="textSecondary">
                      {alert.message}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                      {format(new Date(alert.created_at), 'MMM d, yyyy HH:mm')}
                    </Typography>
                  </Box>
                ))}
                {metrics.recent_alerts.length === 0 && (
                  <Typography color="textSecondary" sx={{ textAlign: 'center', py: 2 }}>
                    No recent alerts
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}; 