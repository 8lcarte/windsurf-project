import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  LinearProgress,
  Paper,
  Tab,
  Tabs,
  Alert,
  Button,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineContent,
  TimelineSeparator,
  TimelineDot,
  TimelineConnector,
} from '@mui/lab';
import {
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { agentsApi, Agent } from '../../api/agents';
import { useQuery } from '@tanstack/react-query';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`agent-tabpanel-${index}`}
      aria-labelledby={`agent-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

type AgentDetails = Agent & {
  description: string;
  openai_assistant_id: string;
  allowed_merchant_categories: string[];
  blocked_merchant_categories: string[];
  allowed_merchants: string[];
  blocked_merchants: string[];
  behavioral_patterns: Array<{
    type: string;
    description: string;
    confidence: number;
    detected_at: string;
  }>;
  risk_metrics: {
    amount_volatility: number;
    merchant_diversity: number;
    time_regularity: number;
    success_rate: number;
  };
  recent_transactions: Array<{
    id: number;
    amount: number;
    merchant_name: string;
    merchant_category: string;
    status: string;
    risk_level: string;
    created_at: string;
  }>;
};

export function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);

  const { 
    data: agent,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['agent', id],
    queryFn: () => agentsApi.getAgent(Number(id)),
    retry: 1,
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (isLoading) {
    return <LinearProgress />;
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert 
          severity="error" 
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button color="inherit" size="small" onClick={() => refetch()}>
                Retry
              </Button>
              <Button color="inherit" size="small" onClick={() => navigate('/agents')}>
                Back to Agents
              </Button>
            </Box>
          }
        >
          Error loading agent details: {error instanceof Error ? error.message : 'Unknown error'}
        </Alert>
      </Box>
    );
  }

  if (!agent) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Agent not found</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h5">{agent.name}</Typography>
                <Chip
                  label={agent.status}
                  color={agent.status === 'active' ? 'success' : 'error'}
                />
              </Box>
              <Typography color="textSecondary" sx={{ mt: 1 }}>
                {agent.description}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Daily Spend
                    </Typography>
                    <Typography variant="h6">
                      ${agent.current_daily_spend.toFixed(2)} / ${agent.daily_spend_limit.toFixed(2)}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(agent.current_daily_spend / agent.daily_spend_limit) * 100}
                      sx={{ mt: 1 }}
                    />
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Risk Level
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6">{agent.risk_level}</Typography>
                      {agent.risk_level === 'high' || agent.risk_level === 'critical' ? (
                        <WarningIcon color="error" />
                      ) : (
                        <SuccessIcon color="success" />
                      )}
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Activity" />
          <Tab label="Behavior Patterns" />
          <Tab label="Risk Analysis" />
          <Tab label="Settings" />
        </Tabs>
      </Box>

      {/* Activity Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Transaction History
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={agent.recent_transactions}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="created_at"
                      tickFormatter={(value) => format(new Date(value), 'MMM d')}
                    />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="amount" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Activity
                </Typography>
                <Timeline>
                  {(agent.recent_transactions || []).slice(0, 5).map((tx) => (
                    <TimelineItem key={tx.id}>
                      <TimelineSeparator>
                        <TimelineDot color={tx.status === 'completed' ? 'success' : 'error'}>
                          {tx.status === 'completed' ? <SuccessIcon /> : <ErrorIcon />}
                        </TimelineDot>
                        <TimelineConnector />
                      </TimelineSeparator>
                      <TimelineContent>
                        <Typography variant="subtitle2">
                          ${tx.amount.toFixed(2)} at {tx.merchant_name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {format(new Date(tx.created_at), 'MMM d, yyyy HH:mm')}
                        </Typography>
                      </TimelineContent>
                    </TimelineItem>
                  ))}
                </Timeline>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Behavior Patterns Tab */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          {(agent.behavioral_patterns || []).map((pattern, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <TrendingUpIcon />
                    <Typography variant="h6">{pattern.type}</Typography>
                  </Box>
                  <Typography variant="body2" paragraph>
                    {pattern.description}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip
                      label={`${(pattern.confidence * 100).toFixed(0)}% confidence`}
                      color="primary"
                      size="small"
                    />
                    <Typography variant="caption" color="textSecondary">
                      Detected {format(new Date(pattern.detected_at), 'MMM d, yyyy')}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Risk Analysis Tab */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Risk Metrics
                </Typography>
                <Box sx={{ mt: 2 }}>
                  {Object.entries(agent.risk_metrics || {}).map(([metric, value]) => (
                    <Box key={metric} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">
                          {metric.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </Typography>
                        <Typography variant="body2">{(value * 10).toFixed(1)}/10</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={value * 10}
                        color={value > 0.7 ? 'error' : value > 0.4 ? 'warning' : 'success'}
                      />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Merchant Restrictions
                </Typography>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Allowed Categories
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {(agent.allowed_merchant_categories || []).map((category) => (
                      <Chip key={category} label={category} color="success" size="small" />
                    ))}
                  </Box>
                </Box>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Blocked Categories
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {(agent.blocked_merchant_categories || []).map((category) => (
                      <Chip key={category} label={category} color="error" size="small" />
                    ))}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Settings Tab */}
      <TabPanel value={tabValue} index={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Agent Configuration
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  OpenAI Assistant ID
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {agent.openai_assistant_id}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Created At
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {format(new Date(agent.created_at), 'MMM d, yyyy HH:mm')}
                </Typography>
              </Grid>
              {/* Add more configuration fields as needed */}
            </Grid>
          </CardContent>
        </Card>
      </TabPanel>
    </Box>
  );
}