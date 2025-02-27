import {
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Chip,
  Box,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
  Menu,
  MenuItem,
  Button,
  ListItemIcon,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Info as InfoIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Search as SearchIcon,
  Sort as SortIcon,
  Download as DownloadIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import { useState, useMemo, MouseEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { exportToCSV } from '../../utils/exportUtils';
import { TransactionDetailModal } from './TransactionDetailModal';
import { Transaction, transactionsApi } from '../../api/transactions';

type Filter = 'all' | 'completed' | 'pending' | 'failed';
type SortField = 'date' | 'amount' | 'description';
type SortOrder = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  order: SortOrder;
}

const statusColors: Record<Transaction['status'], 'success' | 'warning' | 'error'> = {
  completed: 'success',
  pending: 'warning',
  failed: 'error',
};

export function TransactionList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Filter>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'date', order: 'desc' });
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);

  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ['transactions'],
    queryFn: transactionsApi.getAll,
  });

  const handleSortClick = (event: MouseEvent<HTMLElement>) => {
    setSortAnchorEl(event.currentTarget);
  };

  const handleSortClose = () => {
    setSortAnchorEl(null);
  };

  const handleSortSelect = (field: SortField) => {
    setSortConfig((prevConfig) => ({
      field,
      order: prevConfig.field === field && prevConfig.order === 'asc' ? 'desc' : 'asc',
    }));
    handleSortClose();
  };

  const handleExport = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    exportToCSV(filteredTransactions, `transactions-${timestamp}`);
  };

  const handleStatusFilterChange = (_: React.MouseEvent<HTMLElement>, newFilter: Filter) => {
    if (newFilter !== null) {
      setStatusFilter(newFilter);
    }
  };

  const filteredTransactions = useMemo(() => {
    const filtered = transactions.filter((transaction) => {
      const matchesSearch = transaction.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' || transaction.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortConfig.field) {
        case 'date':
          comparison = new Date(b.date).getTime() - new Date(a.date).getTime();
          break;
        case 'amount':
          comparison = b.amount - a.amount;
          break;
        case 'description':
          comparison = a.description.localeCompare(b.description);
          break;
        default:
          comparison = 0;
      }
      return sortConfig.order === 'asc' ? comparison : -comparison;
    });
  }, [searchQuery, statusFilter, sortConfig, transactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(new Date(dateString));
  };

  return (
    <Stack spacing={2}>
      <Box>
        <Stack spacing={1}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              startIcon={<SortIcon />}
              onClick={handleSortClick}
              variant="outlined"
            >
              Sort By
            </Button>
            <Button
              size="small"
              startIcon={<DownloadIcon />}
              onClick={handleExport}
              variant="outlined"
            >
              Export CSV
            </Button>
          </Box>

          <Menu
            anchorEl={sortAnchorEl}
            open={Boolean(sortAnchorEl)}
            onClose={handleSortClose}
          >
            <MenuItem onClick={() => handleSortSelect('date')}>
              <ListItemIcon>
                <CalendarIcon fontSize="small" />
              </ListItemIcon>
              Date {sortConfig.field === 'date' && (sortConfig.order === 'asc' ? '↑' : '↓')}
            </MenuItem>
            <MenuItem onClick={() => handleSortSelect('amount')}>
              <ListItemIcon>
                <MoneyIcon fontSize="small" />
              </ListItemIcon>
              Amount {sortConfig.field === 'amount' && (sortConfig.order === 'asc' ? '↑' : '↓')}
            </MenuItem>
            <MenuItem onClick={() => handleSortSelect('description')}>
              <ListItemIcon>
                <CategoryIcon fontSize="small" />
              </ListItemIcon>
              Description {sortConfig.field === 'description' && (sortConfig.order === 'asc' ? '↑' : '↓')}
            </MenuItem>
          </Menu>

          <TextField
            fullWidth
            size="small"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

          <ToggleButtonGroup
            value={statusFilter}
            exclusive
            onChange={handleStatusFilterChange}
            aria-label="transaction status filter"
            size="small"
            fullWidth
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="completed">Completed</ToggleButton>
            <ToggleButton value="pending">Pending</ToggleButton>
            <ToggleButton value="failed">Failed</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            Error loading transactions. Please try again later.
          </Alert>
        </Box>
      ) : (
        <List sx={{ width: '100%', bgcolor: 'background.paper', maxHeight: 400, overflow: 'auto' }}>
          {filteredTransactions.map((transaction) => (
            <ListItem
              key={transaction.id}
              alignItems="flex-start"
              secondaryAction={
                <Tooltip title="View Details">
                  <IconButton
                    edge="end"
                    aria-label="details"
                    onClick={() => setSelectedTransaction(transaction)}
                  >
                    <InfoIcon />
                  </IconButton>
                </Tooltip>
              }
              sx={{
                '&:not(:last-child)': {
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                },
              }}
            >
              <ListItemAvatar>
                <Avatar
                  sx={{
                    bgcolor: transaction.type === 'credit' ? 'success.light' : 'primary.light',
                  }}
                >
                  {transaction.type === 'credit' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Typography component="div" variant="subtitle1">
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <span>{transaction.description}</span>
                      <span style={{ color: transaction.type === 'credit' ? '#2e7d32' : 'inherit' }}>
                        {transaction.type === 'credit' ? '+' : '-'} {formatCurrency(transaction.amount)}
                      </span>
                    </Stack>
                  </Typography>
                }
                secondary={
                  <Typography component="div" variant="body2">
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                      <span>{formatDate(transaction.date)}</span>
                      <Chip
                        label={transaction.status}
                        size="small"
                        color={statusColors[transaction.status]}
                        sx={{ height: 20 }}
                      />
                    </Stack>
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>
      )}

      <TransactionDetailModal
        open={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        transaction={selectedTransaction}
      />
    </Stack>
  );
}
