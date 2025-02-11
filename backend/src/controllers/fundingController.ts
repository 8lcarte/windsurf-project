import { Request, Response } from 'express';
import { FundingService } from '../services/fundingService';
import { IntegrationManager } from '../integrations/integrationManager';
import { PayPalIntegration } from '../integrations/providers/paypal';
import { VenmoIntegration } from '../integrations/providers/venmo';
import { CashAppIntegration } from '../integrations/providers/cashapp';

export const fundingController = {
  async addFunds(req: Request, res: Response) {
    try {
      const { cardId, amount, currency, sourceId, description } = req.body;
      
      const result = await FundingService.getInstance().addFunds({
        cardId,
        amount,
        currency,
        sourceId,
        description
      });
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  },

  async validateFundingSource(req: Request, res: Response) {
    try {
      const { sourceId } = req.params;
      const isValid = await FundingService.getInstance().validateFundingSource(sourceId);
      
      res.status(200).json({
        success: true,
        data: { isValid }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  },

  async createPayPalPaymentLink(req: Request, res: Response) {
    try {
      const { integrationId } = req.params;
      const { amount, currency, description } = req.body;
      
      const paypalIntegration = await IntegrationManager.getInstance()
        .getIntegration(integrationId) as PayPalIntegration;
      
      const paymentLink = await paypalIntegration.createPaymentLink({
        amount,
        currency,
        description
      });
      
      res.status(200).json({
        success: true,
        data: { paymentLink }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  },

  async createVenmoPaymentLink(req: Request, res: Response) {
    try {
      const { integrationId } = req.params;
      const { amount, note } = req.body;
      
      const venmoIntegration = await IntegrationManager.getInstance()
        .getIntegration(integrationId) as VenmoIntegration;
      
      const paymentLink = await venmoIntegration.createPaymentRequestLink({
        amount,
        note
      });
      
      res.status(200).json({
        success: true,
        data: { paymentLink }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  },

  async createCashAppPaymentLink(req: Request, res: Response) {
    try {
      const { integrationId } = req.params;
      const { amount, currency, note } = req.body;
      
      const cashAppIntegration = await IntegrationManager.getInstance()
        .getIntegration(integrationId) as CashAppIntegration;
      
      const paymentLink = await cashAppIntegration.createPaymentLink({
        amount,
        currency,
        note
      });
      
      res.status(200).json({
        success: true,
        data: { paymentLink }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  },

  async getDigitalWalletBalance(req: Request, res: Response) {
    try {
      const { integrationId, provider } = req.params;
      let balance;

      const integration = IntegrationManager.getInstance().getIntegration(integrationId);
      
      switch (provider) {
        case 'venmo':
          balance = await (integration as VenmoIntegration).getBalance();
          break;
        case 'cashapp':
          balance = await (integration as CashAppIntegration).getBalance();
          break;
        case 'paypal':
          balance = await (integration as PayPalIntegration).getPayPalBalance();
          break;
        default:
          throw new Error('Unsupported digital wallet provider');
      }
      
      res.status(200).json({
        success: true,
        data: { balance }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  },

  async capturePayPalPayment(req: Request, res: Response) {
    try {
      const { integrationId, orderId } = req.params;
      
      const paypalIntegration = await IntegrationManager.getInstance()
        .getIntegration(integrationId) as PayPalIntegration;
      
      const result = await paypalIntegration.capturePayment(orderId);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
};
