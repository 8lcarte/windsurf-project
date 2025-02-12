import { Grid, Paper, Typography, Box, Button } from '@mui/material';
import { ArrowForward as ArrowForwardIcon } from '@mui/icons-material';
import { TransactionList } from '../components/Dashboard/TransactionList';
import { QuickActions } from '../components/Dashboard/QuickActions';
import { DashboardLayout } from '../components/Dashboard/DashboardLayout';
import {
  AccountBalance as AccountBalanceIcon,
  CreditCard as CreditCardIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <Paper
      sx={{
        p: 1.5,
        display: 'flex',
        flexDirection: 'column',
        height: 120,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -10,
          right: -10,
          opacity: 0.2,
          transform: 'rotate(30deg)',
        }}
      >
        {icon}
      </Box>
      <Typography color="text.secondary" variant="subtitle2" gutterBottom>
        {title}
      </Typography>
      <Typography
        color={color}
        variant="h4"
        component="div"
        sx={{ mt: 'auto', mb: 1 }}
      >
        {value}
      </Typography>
    </Paper>
  );
}

export function DashboardPage() {
  const stats = [
    {
      title: 'Total Balance',
      value: '$25,000.00',
      icon: <AccountBalanceIcon sx={{ fontSize: 100 }} />,
      color: 'primary.main',
    },
    {
      title: 'Active Cards',
      value: '12',
      icon: <CreditCardIcon sx={{ fontSize: 100 }} />,
      color: 'success.main',
    },
    {
      title: 'Monthly Spend',
      value: '$8,459.32',
      icon: <TrendingUpIcon sx={{ fontSize: 100 }} />,
      color: 'info.main',
    },
    {
      title: 'Pending Approvals',
      value: '3',
      icon: <WarningIcon sx={{ fontSize: 100 }} />,
      color: 'warning.main',
    },
  ];

  return (
    <DashboardLayout>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Welcome back!
      </Typography>
      <Grid container spacing={2}>
        {stats.map((stat) => (
          <Grid key={stat.title} item xs={12} sm={6} md={3}>
            <StatCard {...stat} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 1, height: 400 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">
                Recent Transactions
              </Typography>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon />}
                onClick={() => console.log('View all transactions')}
              >
                View All
              </Button>
            </Box>
            <TransactionList />
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <QuickActions />
          </Paper>
        </Grid>
      </Grid>
    </DashboardLayout>
  );
}
