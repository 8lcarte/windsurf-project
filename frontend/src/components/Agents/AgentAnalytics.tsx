import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format, subDays } from 'date-fns';

interface TransactionMetrics {
  total_transactions: number;
  total_amount: number;
  average_amount: number;
  success_rate: number;
  daily_metrics: Array<{
    date: string;
    transaction_count: number;
    total_amount: number;
    success_rate: number;
  }>;
  merchant_distribution: Array<{
    merchant_category: string;
    transaction_count: number;
    total_amount: number;
  }>;
  risk_distribution: Array<{
    risk_level: string;
    transaction_count: number;
  }>;
  hourly_distribution: Array<{
    hour: number;
    transaction_count: number;
    average_amount: number;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const AgentAnalytics: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [timeRange, setTimeRange] = useState<number>(30); // days
  const [metrics, setMetrics] = useState<TransactionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [id, timeRange]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(
        `/api/v1/agents/${id}/analytics?days=${timeRange}`
      );
      const data = await response.json();
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError('Failed to load analytics data');
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CircularProgress />;
  if (!metrics) return <Alert severity="error">Analytics data not available</Alert>;

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">Agent Analytics</Typography>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Time Range</InputLabel>
          <Select
            value={timeRange}
            label="Time Range"
            onChange={(e) => setTimeRange(Number(e.target.value))}
          >
            <MenuItem value={7}>Last 7 days</MenuItem>
            <MenuItem value={30}>Last 30 days</MenuItem>
            <MenuItem value={90}>Last 90 days</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Transactions
              </Typography>
              <Typography variant="h4">
                {metrics.total_transactions.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Amount
              </Typography>
              <Typography variant="h4">
                ${metrics.total_amount.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Average Transaction
              </Typography>
              <Typography variant="h4">
                ${metrics.average_amount.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Success Rate
              </Typography>
              <Typography variant="h4">
                {(metrics.success_rate * 100).toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Transaction Trends */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Transaction Trends
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics.daily_metrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => format(new Date(value), 'MMM d')}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip
                    labelFormatter={(value) =>
                      format(new Date(value), 'MMM d, yyyy')
                    }
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="total_amount"
                    stroke="#8884d8"
                    name="Total Amount ($)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="transaction_count"
                    stroke="#82ca9d"
                    name="Transaction Count"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Merchant Category Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Merchant Category Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.merchant_distribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="merchant_category" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="transaction_count" fill="#8884d8" name="Transactions" />
                  <Bar dataKey="total_amount" fill="#82ca9d" name="Amount ($)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Risk Level Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Risk Level Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={metrics.risk_distribution}
                    dataKey="transaction_count"
                    nameKey="risk_level"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {metrics.risk_distribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Hourly Distribution */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Hourly Transaction Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.hourly_distribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={(hour) =>
                      format(new Date().setHours(hour, 0), 'ha')
                    }
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(hour) =>
                      format(new Date().setHours(hour, 0), 'ha')
                    }
                  />
                  <Legend />
                  <Bar
                    dataKey="transaction_count"
                    fill="#8884d8"
                    name="Transaction Count"
                  />
                  <Bar
                    dataKey="average_amount"
                    fill="#82ca9d"
                    name="Average Amount ($)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}; 