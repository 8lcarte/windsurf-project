import express from 'express';
import { fundingController } from '../controllers/fundingController';

export const fundingRouter = express.Router();

// Add funds to a card
fundingRouter.post('/add-funds', fundingController.addFunds);

// Validate funding source
fundingRouter.get('/sources/:sourceId/validate', fundingController.validateFundingSource);

// Digital wallet routes
fundingRouter.post('/paypal/:integrationId/payment-link', fundingController.createPayPalPaymentLink);
fundingRouter.post('/paypal/:integrationId/capture/:orderId', fundingController.capturePayPalPayment);
fundingRouter.post('/venmo/:integrationId/payment-link', fundingController.createVenmoPaymentLink);
fundingRouter.post('/cashapp/:integrationId/payment-link', fundingController.createCashAppPaymentLink);

// Get digital wallet balances
fundingRouter.get('/:provider/:integrationId/balance', fundingController.getDigitalWalletBalance);
