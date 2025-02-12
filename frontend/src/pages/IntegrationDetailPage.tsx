import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Container, Typography, Box } from '@mui/material';
import { LangChainIntegration } from '../components/Integrations/LangChainIntegration';
import { OpenAIIntegration } from '../components/Integrations/OpenAIIntegration';

export const IntegrationDetailPage: React.FC = () => {
  const { integrationId } = useParams<{ integrationId: string }>();

  // Map integration IDs to their components
  const integrationComponents: { [key: string]: React.ReactNode } = {
    openai: <OpenAIIntegration />,
    langchain: <LangChainIntegration />,
    // Add other integration components here as they become available
  };

  // If the integration doesn't exist, redirect to the integrations list
  if (!integrationComponents[integrationId || '']) {
    return <Navigate to="/integrations" replace />;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box mb={4}>
        {integrationComponents[integrationId || '']}
      </Box>
    </Container>
  );
};

