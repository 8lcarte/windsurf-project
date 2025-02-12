import React from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  CardActionArea,
  Divider,
} from '@mui/material';
import {
  CodeRounded,
  SmartToyRounded,
  PaymentRounded,
  AccountBalanceWallet as WalletIcon,
  Payment as PayPalIcon,
  LocalAtm as CashAppIcon,
} from '@mui/icons-material';
import { FundingSourceCard } from '../components/Integrations/FundingSourceCard';
import { useSnackbar } from 'notistack';
import { useFundingSource } from '../hooks/useFundingSource';

const platformIntegrations = [
  {
    id: 'langchain',
    name: 'LangChain',
    description: 'Build AI agents that can manage virtual cards and analyze spending patterns.',
    icon: SmartToyRounded,
    status: 'Available',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Process payments and manage card transactions securely.',
    icon: PaymentRounded,
    status: 'Coming Soon',
  },
  {
    id: 'plaid',
    name: 'Plaid',
    description: 'Connect bank accounts and analyze financial data.',
    icon: CodeRounded,
    status: 'Coming Soon',
  },
];

const FUNDING_SOURCE_CONFIG = {
  paypal: {
    name: 'PayPal',
    description: 'Connect your PayPal account to fund your virtual cards directly.',
    icon: PayPalIcon,
  },
  venmo: {
    name: 'Venmo',
    description: 'Use your Venmo balance to fund virtual cards instantly.',
    icon: WalletIcon,
  },
  cashapp: {
    name: 'Cash App',
    description: 'Link your Cash App account for seamless virtual card funding.',
    icon: CashAppIcon,
  },
} as const;

export const IntegrationsPage: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const {
    fundingSources,
    isLoading,
    isPolling,
    error: globalError,
    connect,
    disconnect,
    isConnecting,
    isDisconnecting,
    refetch,
  } = useFundingSource();

  const handleConnect = async (provider: string) => {
    try {
      await connect(provider.toLowerCase());
      enqueueSnackbar(`Connecting to ${provider}...`, { variant: 'info' });
    } catch (error) {
      enqueueSnackbar(`Failed to connect to ${provider}. Please try again.`, {
        variant: 'error',
      });
    }
  };

  const handleDisconnect = async (sourceId: string) => {
    try {
      await disconnect(sourceId);
      enqueueSnackbar(`Successfully disconnected funding source`, {
        variant: 'success',
      });
    } catch (error) {
      enqueueSnackbar(`Failed to disconnect funding source. Please try again.`, {
        variant: 'error',
      });
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Integrations
      </Typography>
      
      <Box sx={{ mb: 6 }}>
        <Typography variant="h5" gutterBottom>
          Funding Sources
        </Typography>
        <Typography variant="body1" paragraph>
          Connect your preferred payment methods to fund your virtual cards.
        </Typography>
        <Grid container spacing={3}>
          {fundingSources.map((source) => {
            const config = FUNDING_SOURCE_CONFIG[source.provider as keyof typeof FUNDING_SOURCE_CONFIG];
            if (!config) {
              console.warn(`No configuration found for provider: ${source.provider}`);
              return null;
            }
            return (
              <Grid item xs={12} md={6} lg={4} key={source.id}>
                <FundingSourceCard
                  name={config.name}
                  description={config.description}
                  icon={config.icon}
                  connected={source.connected}
                  onConnect={() => handleConnect(source.provider)}
                  onDisconnect={() => handleDisconnect(source.id)}
                  disabled={isConnecting || isDisconnecting}
                  isLoading={isLoading}
                  isPolling={isPolling && source.provider === globalError?.provider}
                  error={globalError?.provider === source.provider ? globalError : null}
                  onRetry={refetch}
                />
              </Grid>
            );
          })}
        </Grid>
      </Box>

      <Divider sx={{ my: 4 }} />
      
      <Box>
        <Typography variant="h5" gutterBottom>
          Platform Integrations
        </Typography>
        <Typography variant="body1" paragraph>
          Extend your virtual card capabilities with our growing list of integrations.
        </Typography>
        <Grid container spacing={3}>
          {platformIntegrations.map((integration) => {
            const Icon = integration.icon;
            return (
              <Grid item xs={12} md={4} key={integration.id}>
                <Card>
                  <CardActionArea
                    component={Link}
                    to={`/integrations/${integration.id}`}
                    disabled={integration.status === 'Coming Soon'}
                  >
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Icon sx={{ fontSize: 40, mr: 2 }} />
                        <Box>
                          <Typography variant="h6" component="div">
                            {integration.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            color={integration.status === 'Available' ? 'success.main' : 'text.secondary'}
                          >
                            {integration.status}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {integration.description}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    </Container>
  );
};

