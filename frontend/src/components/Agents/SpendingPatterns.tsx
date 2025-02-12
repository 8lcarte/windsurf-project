import React, { useState, useEffect } from 'react';
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
  Chip,
  Tooltip,
} from '@mui/material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface SpendingData {
  daily_spending: Array<{
    date: string;
    amount: number;
    transaction_count: number;
  }>;
  merchant_categories: Array<{
    category: string;
    total_amount: number;
    transaction_count: number;
    percentage: number;
  }>;
  time_distribution: Array<{
    hour: number;
    amount: number;
    transaction_count: number;
  }>;
  spending_trends: {
    current_month_total: number;
    previous_month_total: number;
    month_over_month_change: number;
    average_transaction_amount: number;
    peak_spending_day: {
      date: string;
      amount: number;
    };
    top_merchant_category: {
      category: string;
      amount: number;
      percentage: number;
    };
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#A4DE6C'];

export const SpendingPatterns: React.FC<{ agentId: string }> = ({ agentId }) => {
  const [timeRange, setTimeRange] = useState<number>(30); // days
  const [spendingData, setSpendingData] = useState<SpendingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSpendingData();
  }, [agentId, timeRange]);

  const fetchSpendingData = async () => {
    try {
      const response = await fetch(
        `/api/v1/agents/${agentId}/spending-patterns?days=${timeRange}`
      );
      const data = await response.json();
      setSpendingData(data);
      setError(null);
    } catch (err) {
      setError('Failed to load spending patterns');
      console.error('Error fetching spending patterns:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!spendingData) return <Alert severity="error">Spending data not available</Alert>;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">Spending Patterns</Typography>
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
                Current Month Spending
              </Typography>
              <Typography variant="h4">
                {formatCurrency(spendingData.spending_trends.current_month_total)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Chip
                  size="small"
                  label={`${spendingData.spending_trends.month_over_month_change > 0 ? '+' : ''}${
                    spendingData.spending_trends.month_over_month_change
                  }%`}
                  color={spendingData.spending_trends.month_over_month_change > 0 ? 'error' : 'success'}
                  sx={{ mr: 1 }}
                />
                <Typography variant="body2" color="textSecondary">
                  vs last month
                </Typography>
              </Box>
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
                {formatCurrency(spendingData.spending_trends.average_transaction_amount)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Peak Spending Day
              </Typography>
              <Typography variant="h4">
                {formatCurrency(spendingData.spending_trends.peak_spending_day.amount)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {format(new Date(spendingData.spending_trends.peak_spending_day.date), 'MMM d, yyyy')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Top Merchant Category
              </Typography>
              <Typography variant="h4">
                {spendingData.spending_trends.top_merchant_category.category}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {formatCurrency(spendingData.spending_trends.top_merchant_category.amount)} (
                {spendingData.spending_trends.top_merchant_category.percentage.toFixed(1)}%)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Daily Spending Trends */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Daily Spending Trends
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={spendingData.daily_spending}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => format(new Date(value), 'MMM d')}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <RechartsTooltip
                    formatter={(value: number, name: string) =>
                      name === 'Amount' ? formatCurrency(value) : value
                    }
                    labelFormatter={(value) => format(new Date(value), 'MMM d, yyyy')}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="amount"
                    stroke="#8884d8"
                    name="Amount"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="transaction_count"
                    stroke="#82ca9d"
                    name="Transactions"
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
                Spending by Merchant Category
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={spendingData.merchant_categories}
                    dataKey="total_amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({
                      cx,
                      cy,
                      midAngle,
                      innerRadius,
                      outerRadius,
                      value,
                      index,
                    }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = 25 + innerRadius + (outerRadius - innerRadius);
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);

                      return (
                        <text
                          x={x}
                          y={y}
                          fill="#666"
                          textAnchor={x > cx ? 'start' : 'end'}
                          dominantBaseline="central"
                        >
                          {spendingData.merchant_categories[index].category} (
                          {spendingData.merchant_categories[index].percentage.toFixed(1)}%)
                        </text>
                      );
                    }}
                  >
                    {spendingData.merchant_categories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Hourly Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Spending by Time of Day
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={spendingData.time_distribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={(hour) => format(new Date().setHours(hour, 0), 'ha')}
                  />
                  <YAxis />
                  <RechartsTooltip
                    formatter={(value: number, name: string) =>
                      name === 'Amount' ? formatCurrency(value) : value
                    }
                    labelFormatter={(hour) => format(new Date().setHours(hour, 0), 'ha')}
                  />
                  <Legend />
                  <Bar dataKey="amount" name="Amount" fill="#8884d8" />
                  <Bar dataKey="transaction_count" name="Transactions" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}; 