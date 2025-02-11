import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Grid,
  Divider,
} from '@mui/material';
import { ReceiptSection } from './ReceiptSection';
import {
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
} from '@mui/icons-material';

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
  receipt?: {
    content: string;
    metadata: {
      timestamp: string;
      merchantName: string;
      totalAmount: number;
      currency: string;
      items?: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }>;
    };
  };
}

interface TransactionDetailModalProps {
  open: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

const statusColors = {
  completed: 'success',
  pending: 'warning',
  failed: 'error',
} as const;

export function TransactionDetailModal({
  open,
  onClose,
  transaction,
}: TransactionDetailModalProps) {
  if (!transaction) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(new Date(dateString));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          Transaction Details
          <Chip
            label={transaction.status}
            size="small"
            color={statusColors[transaction.status]}
            sx={{ ml: 'auto' }}
          />
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 3,
            }}
          >
            <Typography variant="h4" color={transaction.type === 'credit' ? 'success.main' : 'text.primary'}>
              {transaction.type === 'credit' ? (
                <ArrowUpwardIcon color="success" sx={{ fontSize: 40, verticalAlign: 'bottom' }} />
              ) : (
                <ArrowDownwardIcon color="primary" sx={{ fontSize: 40, verticalAlign: 'bottom' }} />
              )}
              {formatCurrency(transaction.amount)}
            </Typography>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">
                Description
              </Typography>
              <Typography variant="body1">{transaction.description}</Typography>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">
                Date & Time
              </Typography>
              <Typography variant="body1">{formatDate(transaction.date)}</Typography>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>

            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Card ID
              </Typography>
              <Typography variant="body1">{transaction.cardId || 'N/A'}</Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Merchant
              </Typography>
              <Typography variant="body1">{transaction.merchantName || 'N/A'}</Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Category
              </Typography>
              <Typography variant="body1">{transaction.category || 'Uncategorized'}</Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Transaction ID
              </Typography>
              <Typography variant="body1">{transaction.id}</Typography>
            </Grid>

            {transaction.notes && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Notes
                </Typography>
                <Typography variant="body1">{transaction.notes}</Typography>
              </Grid>
            )}

            {transaction.receipt && (
              <Grid item xs={12}>
                <Box sx={{ mt: 2 }}>
                  <ReceiptSection
                    content={transaction.receipt.content}
                    metadata={transaction.receipt.metadata}
                  />
                </Box>
              </Grid>
            )}
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {transaction.receipt && (
          <Button 
            variant="contained" 
            onClick={() => {
              const receiptText = `${transaction.receipt?.content}\n\nItems:\n${
                transaction.receipt?.metadata.items?.map(
                  item => `${item.description}: ${item.quantity} x $${item.unitPrice} = $${item.totalPrice}`
                ).join('\n')
              }`;
              const blob = new Blob([receiptText], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `receipt-${transaction.id}.txt`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
          >
            Download Receipt
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
