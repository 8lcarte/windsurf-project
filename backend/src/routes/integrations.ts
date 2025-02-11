import express from 'express';
import { integrationController } from '../controllers/integrationController';

export const integrationsRouter = express.Router();

// Get all integrations
integrationsRouter.get('/', integrationController.getIntegrations);

// Get supported integration types and providers
integrationsRouter.get('/supported', integrationController.getSupportedIntegrations);

// Add new integration
integrationsRouter.post('/', integrationController.addIntegration);

// Remove integration
integrationsRouter.delete('/:integrationId', integrationController.removeIntegration);

// Sync integration
integrationsRouter.post('/:integrationId/sync', integrationController.syncIntegration);

// Create expense report
integrationsRouter.post('/:integrationId/reports', integrationController.createExpenseReport);

// Get integration status
integrationsRouter.get('/:integrationId/status', integrationController.getIntegrationStatus);

// Plaid-specific routes
integrationsRouter.get('/:integrationId/plaid/link-token', integrationController.createPlaidLinkToken);
integrationsRouter.get('/:integrationId/plaid/accounts/:accountId/balance', integrationController.getAccountBalance);
