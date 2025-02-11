import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import {
  Box,
  Grid,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  ContentCopy as CopyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { CreateCardModal } from '../components/VirtualCards/CreateCardModal';
import { CardDetailsModal } from '../components/VirtualCards/CardDetailsModal';
import { virtualCardsApi, VirtualCard } from '../api/virtualCards';
import { LoadingSpinner } from '../components/common/LoadingSpinner';



const statusColors = {
  active: 'success',
  inactive: 'warning',
  expired: 'error',
} as const;

export function VirtualCardsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<VirtualCard | null>(null);
  const [showCardNumber, setShowCardNumber] = useState<{id: string, number: string, cvv: string} | null>(null);
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  // Queries
  const { data: cardsResponse, isLoading, error } = useQuery({
    queryKey: ['virtualCards'],
    queryFn: async () => {
      const response = await virtualCardsApi.getCards();
      return response.data || [];
    },
  });

  const cards = Array.isArray(cardsResponse) ? cardsResponse : [];

  // Mutations
  const createCardMutation = useMutation({
    mutationFn: virtualCardsApi.createCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtualCards'] });
      enqueueSnackbar('Virtual card created successfully', { variant: 'success' });
      setIsCreateModalOpen(false);
    },
    onError: () => {
      enqueueSnackbar('Failed to create virtual card', { variant: 'error' });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, frozen }: { id: string; frozen: boolean }) =>
      Promise.resolve({ id, frozen }),
    onSuccess: (_, { frozen }) => {
      queryClient.invalidateQueries({ queryKey: ['virtualCards'] });
      enqueueSnackbar(
        `Card ${frozen ? 'frozen' : 'unfrozen'} successfully`,
        { variant: 'success' }
      );
    },
    onError: () => {
      enqueueSnackbar('Failed to update card status', { variant: 'error' });
    },
  });

  const getCardNumberMutation = useMutation({
    mutationFn: (id: string) =>
      Promise.resolve({ number: '4242424242424242', cvv: '123' }),
    onSuccess: (data, id) => {
      setShowCardNumber({ id, ...data });
      // Auto-hide after 30 seconds
      setTimeout(() => setShowCardNumber(null), 30000);
    },
    onError: () => {
      enqueueSnackbar('Failed to retrieve card details', { variant: 'error' });
    },
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!cards) return null;


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleCreateCard = (cardData: { name: string; spendLimit: number }) => {
    createCardMutation.mutate(cardData);
  };

  const handleCopyNumber = async (cardId: string) => {
    if (showCardNumber?.id === cardId) {
      await navigator.clipboard.writeText(showCardNumber.number);
      enqueueSnackbar('Card number copied to clipboard', { variant: 'success' });
    } else {
      getCardNumberMutation.mutate(cardId);
    }
  };

  const handleToggleFreeze = (card: VirtualCard) => {
    updateStatusMutation.mutate({ id: card.id, frozen: !card.frozen });
  };

  const handleViewDetails = (card: VirtualCard) => {
    setSelectedCard(card);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Virtual Cards
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Create Card
        </Button>
      </Box>

      <Grid container spacing={3}>
        {cards.map((card) => (
          <Grid item xs={12} md={6} lg={4} key={card.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                cursor: 'pointer',
                '&:hover': {
                  boxShadow: (theme) => theme.shadows[4],
                },
              }}
              onClick={() => handleViewDetails(card)}
            >
              <CardContent>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" component="div">
                    {card.name}
                  </Typography>
                  <Chip
                    label={card.status}
                    color={statusColors[card.status]}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Card Number
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body1">•••• •••• •••• {card.lastFour}</Typography>
                  <Tooltip title="Copy card number">
                    <IconButton
                      size="small"
                      onClick={() => handleCopyNumber(card.id)}
                      sx={{ ml: 1 }}
                    >
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Expiry Date
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {card.expiryDate}
                </Typography>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Available Balance
                  </Typography>
                  <Typography variant="h6" color="primary.main">
                    {formatCurrency(card.balance)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    of {formatCurrency(card.spendLimit)} limit
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <CreateCardModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateCard}
      />

      <CardDetailsModal
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
      />
    </Box>
  );
}
