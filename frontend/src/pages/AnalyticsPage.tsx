import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  useTheme
} from '@mui/material';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';
import { virtualCardsApi } from '../api/virtualCards';
import { budgetsApi, Budget } from '../api/budgets';
import { BudgetManager } from '../components/Analytics/BudgetManager';

interface SpendingByCategory {
  category: string;
  amount: number;
}

interface SpendingOverTime {
  date: string;
  amount: number;
}

interface TopMerchant {
  merchantName: string;
  totalSpent: number;
}

export function AnalyticsPage() {
  const theme = useTheme();
  const [spendingByCategory, setSpendingByCategory] = useState<SpendingByCategory[]>([]);
  const [spendingOverTime, setSpendingOverTime] = useState<SpendingOverTime[]>([]);
  const [topMerchants, setTopMerchants] = useState<TopMerchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categorySpending, setCategorySpending] = useState<Map<string, number>>(new Map());

  const COLORS = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.error.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.success.main,
  ];

  const fetchBudgets = useCallback(async () => {
    try {
      const response = await budgetsApi.getAll();
      setBudgets(response.data);
    } catch (error) {
      console.error('Error fetching budgets:', error);
    }
  }, []);

  useEffect(() => {
    const fetchAnalytics = async () => {
      await fetchBudgets();

      try {
        const cards = await virtualCardsApi.getCards();
        
        // Process spending by category
        const categoryMap = new Map<string, number>();
        const merchantMap = new Map<string, number>();
        const dateMap = new Map<string, number>();

        cards.data.forEach(card => {
          card.transactions.forEach(transaction => {
            // Category spending
            const currentCategoryAmount = categoryMap.get(transaction.category) || 0;
            categoryMap.set(transaction.category, currentCategoryAmount + transaction.amount);

            // Merchant spending
            const currentMerchantAmount = merchantMap.get(transaction.merchantName) || 0;
            merchantMap.set(transaction.merchantName, currentMerchantAmount + transaction.amount);

            // Daily spending
            const date = format(new Date(transaction.date), 'yyyy-MM-dd');
            const currentDateAmount = dateMap.get(date) || 0;
            dateMap.set(date, currentDateAmount + transaction.amount);
          });
        });

        // Transform category data
        const categoryData = Array.from(categoryMap.entries()).map(([category, amount]) => ({
          category,
          amount
        }));

        // Transform merchant data
        const merchantData = Array.from(merchantMap.entries())
          .map(([merchantName, totalSpent]) => ({
            merchantName,
            totalSpent
          }))
          .sort((a, b) => b.totalSpent - a.totalSpent)
          .slice(0, 5);

        // Transform date data
        const dateData = Array.from(dateMap.entries())
          .map(([date, amount]) => ({
            date,
            amount
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        setSpendingByCategory(categoryData);
        setTopMerchants(merchantData);
        setSpendingOverTime(dateData);
        setCategorySpending(categoryMap);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <Container>
        <Typography>Loading analytics...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Spending Analytics
      </Typography>

      <Grid container spacing={3}>
        {/* Spending by Category */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Spending by Category
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={spendingByCategory}
                  dataKey="amount"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ category, amount }) => 
                    `${category}: ${formatCurrency(amount)}`
                  }
                >
                  {spendingByCategory.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Top Merchants */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Top Merchants
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topMerchants}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="merchantName" />
                <YAxis 
                  tickFormatter={(value) => 
                    formatCurrency(value).replace('$', '')
                  }
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar 
                  dataKey="totalSpent" 
                  fill={theme.palette.primary.main}
                  name="Total Spent"
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Spending Over Time */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Spending Over Time
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spendingOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date"
                  tickFormatter={(date) => format(new Date(date), 'MMM d')}
                />
                <YAxis 
                  tickFormatter={(value) => 
                    formatCurrency(value).replace('$', '')
                  }
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')}
                />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke={theme.palette.primary.main}
                  name="Daily Spending"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Budget Management Section */}
      <Box sx={{ mt: 4 }}>
        <BudgetManager
          budgets={budgets}
          actualSpending={Object.fromEntries(
            Array.from(categorySpending.entries())
          )}
          onBudgetChange={fetchBudgets}
        />
      </Box>
    </Container>
  );
}

export default AnalyticsPage;
