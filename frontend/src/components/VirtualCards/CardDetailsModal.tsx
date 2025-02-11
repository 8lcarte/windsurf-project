import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  TextField,
  Button,
  Switch,
} from '@mui/material';
import { Close as CloseIcon, SmartToy as AgentIcon } from '@mui/icons-material';
import { AgentInfoPanel } from './AgentInfoPanel';
import { VirtualCard, Transaction } from '../../api/virtualCards';
import React, { useState } from 'react';
import { useSnackbar } from 'notistack';
import { virtualCardsApi } from '../../api/virtualCards';
import MerchantControls from './MerchantControls'; // Assuming MerchantControls is in the same directory

interface CardDetailsModalProps {
  card: VirtualCard | null;
  onClose: () => void;
}

export function CardDetailsModal({ card, onClose }: CardDetailsModalProps) {
  if (!card) return null;

  const { enqueueSnackbar } = useSnackbar();
  const [newSpendLimit, setNewSpendLimit] = useState<number | undefined>(card?.spendLimit);
  const [isFrozen, setIsFrozen] = useState(card?.frozen || false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'declined':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleSaveSpendLimit = async () => {
    if (!card || !newSpendLimit) return;

    try {
      await virtualCardsApi.updateLimit(card.id, newSpendLimit);
      enqueueSnackbar('Spend limit updated successfully', { variant: 'success' });
      onClose();
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.message || 'Failed to update spend limit', { variant: 'error' });
    }
  };

  const handleFreezeToggle = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFrozenStatus = event.target.checked;
    setIsFrozen(newFrozenStatus);

    if (!card) return;

    try {
      await virtualCardsApi.updateStatus(card.id, newFrozenStatus);
      enqueueSnackbar(`Card ${newFrozenStatus ? 'frozen' : 'unfrozen'} successfully`, { variant: 'success' });
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.message || 'Failed to update card status', { variant: 'error' });
      setIsFrozen(card.frozen);
    }
  };

  const [allowedCategories, setAllowedCategories] = useState(
    card?.merchantControls?.allowedCategories || []
  );
  const [blockedCategories, setBlockedCategories] = useState(
    card?.merchantControls?.blockedCategories || []
  );
  const [merchantLimits, setMerchantLimits] = useState(
    card?.merchantControls?.maxAmountPerMerchant || {}
  );

  const handleUpdateMerchantControls = async (
    allowed: string[],
    blocked: string[],
    limits: Record<string, number>
  ) => {
    if (!card) return;

    try {
      await virtualCardsApi.updateMerchantControls(card.id, {
        allowedCategories: allowed,
        blockedCategories: blocked,
        maxAmountPerMerchant: limits
      });
      setAllowedCategories(allowed);
      setBlockedCategories(blocked);
      setMerchantLimits(limits);
      enqueueSnackbar('Merchant controls updated successfully', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Failed to update merchant controls', { variant: 'error' });
    }
  };

  return (
    <Dialog open={true} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center">
            {card.metadata?.agent_type && (
              <AgentIcon sx={{ mr: 1, color: 'primary.main' }} />
            )}
            <Typography variant="h6">{card.name}</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <AgentInfoPanel metadata={card.metadata} />
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Card Details
          </Typography>
          <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Status
              </Typography>
              <Chip
                label={card.frozen ? 'Frozen' : card.status}
                color={card.frozen ? 'error' : 'success'}
                size="small"
                sx={{ mt: 0.5 }}
              />
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Last Four
              </Typography>
              <Typography variant="body1">•••• {card.lastFour}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Expiry Date
              </Typography>
              <Typography variant="body1">{card.expiryDate}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Created
              </Typography>
              <Typography variant="body1">
                {formatDate(card.createdAt)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Frozen:
              </Typography>
              <Box display="flex" alignItems="center">
                <Typography>Frozen:</Typography>
                <Switch
                  checked={isFrozen}
                  onChange={handleFreezeToggle}
                  inputProps={{ 'aria-label': 'toggle frozen status' }}
                />
              </Box>
            </Box>
          </Box>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Spending
          </Typography>
          <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Balance
              </Typography>
              <Typography variant="body1">
                {formatCurrency(card.balance)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Spend Limit
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body1" gutterBottom>
                  Current: {formatCurrency(card.spendLimit)}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <TextField
                  label="New Spend Limit"
                  type="number"
                  value={newSpendLimit !== undefined ? newSpendLimit : ''}
                  onChange={(e) => setNewSpendLimit(Number(e.target.value))}
                  size="small"
                  sx={{ width: '200px' }}
                  InputProps={{
                    startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                  }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSaveSpendLimit}
                  sx={{ height: 40 }}
                >
                  Save Spend Limit
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>

        <Box sx={{ mt: 4 }}>
          <MerchantControls
            allowed={allowedCategories}
            blocked={blockedCategories}
            merchantLimits={merchantLimits}
            onUpdate={handleUpdateMerchantControls}
          />
        </Box>

        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Recent Transactions
          </Typography>
          {card.transactions.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No transactions yet
            </Typography>
          ) : (
            <List>
              {card.transactions.map((transaction, index) => (
                <React.Fragment key={transaction.id}>
                  {index > 0 && <Divider />}
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2">
                            {transaction.description}
                          </Typography>
                          <Typography
                            variant="body2"
                            color={transaction.type === 'credit' ? 'success.main' : 'inherit'}
                          >
                            {transaction.type === 'credit' ? '+' : '-'}
                            {formatCurrency(transaction.amount)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(transaction.date)}
                          </Typography>
                          <Chip
                            label={transaction.status}
                            color={getStatusColor(transaction.status)}
                            size="small"
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
