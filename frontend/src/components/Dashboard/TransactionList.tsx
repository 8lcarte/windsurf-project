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
import { exportToCSV } from '../../utils/exportUtils';
import { TransactionDetailModal } from './TransactionDetailModal';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  type: 'debit' | 'credit';
  cardId?: string;
  merchantName?: string;
  category?: string;
  notes?: string;
}

type Filter = 'all' | 'completed' | 'pending' | 'failed';

type SortField = 'date' | 'amount' | 'description';
type SortOrder = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  order: SortOrder;
}

const mockTransactions: Transaction[] = [
  {
    id: '1',
    date: '2025-02-09',
    description: 'AWS Cloud Services',
    amount: 245.50,
    status: 'completed',
    type: 'debit',
    cardId: 'CARD-001',
    merchantName: 'Amazon Web Services',
    category: 'Cloud Infrastructure',
    notes: 'Monthly cloud hosting charges',
  },
  {
    id: '2',
    date: '2025-02-09',
    description: 'GitHub Enterprise',
    amount: 84.00,
    status: 'pending',
    type: 'debit',
    cardId: 'CARD-002',
    merchantName: 'GitHub',
    category: 'Development Tools',
  },
  {
    id: '3',
    date: '2025-02-08',
    description: 'Refund - Azure Services',
    amount: 150.00,
    status: 'completed',
    type: 'credit',
    cardId: 'CARD-001',
    merchantName: 'Microsoft Azure',
    category: 'Cloud Infrastructure',
    notes: 'Service credit for downtime',
  },
  {
    id: '4',
    date: '2025-02-08',
    description: 'Digital Ocean',
    amount: 40.00,
    status: 'failed',
    type: 'debit',
    cardId: 'CARD-003',
    merchantName: 'DigitalOcean',
    category: 'Cloud Infrastructure',
    notes: 'Payment failed - card expired',
  },
];

const statusColors = {
  completed: 'success',
  pending: 'warning',
  failed: 'error',
} as const;

export function TransactionList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Filter>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'date', order: 'desc' });
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);

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
    // First filter
    const filtered = mockTransactions.filter((transaction) => {
      const matchesSearch = transaction.description
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' || transaction.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Then sort
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
      }
      return sortConfig.order === 'asc' ? -comparison : comparison;
    });
  }, [searchQuery, statusFilter, sortConfig]);
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
    <>
      <Box sx={{ mb: 1 }}>
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
            <ToggleButton value="all">
              All
            </ToggleButton>
            <ToggleButton value="completed">
              Completed
            </ToggleButton>
            <ToggleButton value="pending">
              Pending
            </ToggleButton>
            <ToggleButton value="failed">
              Failed
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Box>

      <List sx={{ width: '100%', bgcolor: 'background.paper', maxHeight: 400, overflow: 'auto', mt: 1 }}>
      {filteredTransactions.map((transaction) => (
        <ListItem
          key={transaction.id}
          alignItems="flex-start"
          secondaryAction={
            <Tooltip title="View Details">
              <IconButton edge="end" aria-label="details">
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
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography component="span" variant="subtitle1">
                  {transaction.description}
                </Typography>
                <Typography
                  component="span"
                  variant="subtitle1"
                  color={transaction.type === 'credit' ? 'success.main' : 'text.primary'}
                >
                  {transaction.type === 'credit' ? '+' : '-'} {formatCurrency(transaction.amount)}
                </Typography>
              </Box>
            }
            secondary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Typography component="span" variant="body2" color="text.secondary">
                  {formatDate(transaction.date)}
                </Typography>
                <Chip
                  label={transaction.status}
                  size="small"
                  color={statusColors[transaction.status]}
                  sx={{ height: 20 }}
                />
              </Box>
            }
          />
        </ListItem>
      ))}
    </List>

      <TransactionDetailModal
        open={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        transaction={selectedTransaction}
      />
    </>
  );
}
