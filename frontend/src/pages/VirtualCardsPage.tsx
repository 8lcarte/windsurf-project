import { useState, useMemo } from 'react';
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
import { AgentFilterBar } from '../components/VirtualCards/AgentFilterBar';
import { AgentInfoPanel } from '../components/VirtualCards/AgentInfoPanel';
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
  const [selectedAgentType, setSelectedAgentType] = useState('all');
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

  const agentTypes = useMemo(() => {
    const types = new Set<string>();
    cards.forEach(card => {
      if (card.metadata?.agent_type) {
        types.add(card.metadata.agent_type);
      }
    });
    return Array.from(types);
  }, [cards]);

  const filteredCards = useMemo(() => {
    if (selectedAgentType === 'all') return cards;
    return cards.filter(card => card.metadata?.agent_type === selectedAgentType);
  }, [cards, selectedAgentType]);

  // Mutations
  const createCardMutation = useMutation({
    mutationFn: async (cardData: { name: string; spendLimit: number; metadata?: any }) => {
      // Add validation based on agent type
      if (cardData.metadata?.agent_type === 'procurement_agent' && cardData.spendLimit > 10000) {
        throw new Error('Procurement agent cards require approval for limits over $10,000');
      }
      
      // Add default expiry based on agent type
      const expiryDays = {
        shopping_assistant: 7,  // Short expiry for shopping
        travel_agent: 30,      // Longer for travel bookings
        procurement_agent: 90,  // Extended for business procurement
        subscription_manager: 365 // Annual for subscriptions
      }[cardData.metadata?.agent_type] || 30;

      return virtualCardsApi.createCard({
        ...cardData,
        metadata: {
          ...cardData.metadata,
          created_at: new Date().toISOString(),
          expiry_days: expiryDays
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtualCards'] });
      enqueueSnackbar('Virtual card created successfully', { variant: 'success' });
      setIsCreateModalOpen(false);
    },
    onError: (error: Error) => {
      enqueueSnackbar(error.message || 'Failed to create virtual card', { variant: 'error' });
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

      <AgentFilterBar
        selectedAgentType={selectedAgentType}
        onAgentTypeChange={setSelectedAgentType}
        agentTypes={agentTypes}
        cardCount={filteredCards.length}
      />

      <Grid 
        container 
        spacing={{ xs: 2, sm: 2, md: 3 }}
        columns={{ xs: 4, sm: 8, md: 12, lg: 12, xl: 15 }}
      >
        {filteredCards.map((card) => (
          <Grid 
            item 
            xs={4} 
            sm={4} 
            md={6} 
            lg={4} 
            xl={3} 
            key={card.id}
          >
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
              <CardContent 
                sx={{
                  p: { xs: 2, sm: 2, md: 3 },
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* Header Section */}
                <Box sx={{ mb: 3 }}>
                  <Box 
                    sx={{
                      display: 'flex', 
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      flexDirection: { xs: 'column', sm: 'row' },
                      gap: { xs: 1, sm: 0 },
                      mb: 2
                    }}
                  >
                    {card.metadata?.agent_type && (
                      <AgentIcon sx={{ mr: 1, color: 'primary.main', fontSize: 28 }} />
                    )}
                    <Typography 
                      variant="h6" 
                      component="div" 
                      sx={{ 
                        flex: 1,
                        fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' },
                        wordBreak: 'break-word'
                      }}
                    >
                      {card.name}
                    </Typography>
                    <Tooltip title={card.frozen ? 'Card is frozen' : 'Card is active'}>
                      <Box component="span">
                        <Chip
                          label={card.status}
                          color={statusColors[card.status]}
                          size="small"
                          sx={{ fontWeight: 500 }}
                        />
                      </Box>
                    </Tooltip>
                  </Box>
                  {card.metadata?.agent_type && (
                    <Box 
                      sx={{ 
                        mb: 2,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 1
                      }}
                    >
                      <Chip
                        label={card.metadata.agent_type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ mr: 1 }}
                      />
                      {card.metadata?.department && (
                        <Chip
                          label={`Dept: ${card.metadata.department}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  )}
                </Box>

                {/* Card Details Grid */}
                <Box 
                  sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: { xs: 1.5, sm: 2 },
                    mb: 3,
                    flex: 1,
                    '& .detail-label': {
                      color: 'text.secondary',
                      fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
                      mb: 0.5
                    },
                    '& .detail-value': {
                      fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                      fontWeight: 500,
                      lineHeight: 1.5
                    }
                  }}
                >
                  {/* Card Number */}
                  <Box>
                    <Typography className="detail-label">Card Number</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography className="detail-value">
                        •••• {card.lastFour}
                      </Typography>
                      <Tooltip title="Copy card number">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyNumber(card.id);
                          }}
                          sx={{ ml: 1 }}
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  {/* Expiry */}
                  <Box>
                    <Typography className="detail-label">Expiry Date</Typography>
                    <Typography className="detail-value">
                      {card.expiryDate}
                    </Typography>
                  </Box>

                  {/* Spend Limit */}
                  <Box>
                    <Typography className="detail-label">Spend Limit</Typography>
                    <Typography className="detail-value">
                      {formatCurrency(card.spendLimit)}
                    </Typography>
                  </Box>

                  {/* Agent-specific Info */}
                  {card.metadata?.agent_type && (
                    <Box>
                      <Typography className="detail-label">
                        {card.metadata.agent_type === 'subscription_manager' ? 'Billing Cycle' :
                         card.metadata.agent_type === 'travel_agent' ? 'Trip ID' :
                         card.metadata.agent_type === 'procurement_agent' ? 'PO Number' :
                         'Transaction Type'}
                      </Typography>
                      <Typography className="detail-value">
                        {card.metadata.billing_cycle ||
                         card.metadata.trip_id ||
                         card.metadata.po_number ||
                         'One-time'}
                      </Typography>
                    </Box>
                  )}
                </Box>

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
