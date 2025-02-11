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
} from '@mui/material';
import { CodeRounded, SmartToyRounded, PaymentRounded } from '@mui/icons-material';

const integrations = [
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

export const IntegrationsPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Integrations
      </Typography>
      <Typography variant="body1" paragraph>
        Extend your virtual card capabilities with our growing list of integrations.
      </Typography>
      
      <Grid container spacing={3}>
        {integrations.map((integration) => {
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
    </Container>
  );
};

