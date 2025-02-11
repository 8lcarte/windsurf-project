import { Request, Response } from 'express';
import { IntegrationManager } from '../integrations/integrationManager';
import { IntegrationConfig, IntegrationType, IntegrationProvider } from '../integrations/types';

export const integrationController = {
  async addIntegration(req: Request, res: Response) {
    try {
      const config: IntegrationConfig = req.body;
      await IntegrationManager.getInstance().addIntegration(config);
      
      res.status(201).json({
        success: true,
        data: config
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  },

  async removeIntegration(req: Request, res: Response) {
    try {
      const { integrationId } = req.params;
      await IntegrationManager.getInstance().removeIntegration(integrationId);
      
      res.status(200).json({
        success: true
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  },

  async syncIntegration(req: Request, res: Response) {
    try {
      const { integrationId } = req.params;
      const { since } = req.query;
      
      const result = await IntegrationManager.getInstance().syncIntegration(
        integrationId,
        since ? new Date(since as string) : undefined
      );
      
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

  async createExpenseReport(req: Request, res: Response) {
    try {
      const { integrationId } = req.params;
      const report = req.body;
      
      const reportId = await IntegrationManager.getInstance().createExpenseReport(
        integrationId,
        report
      );
      
      res.status(201).json({
        success: true,
        data: { reportId }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  },

  async getIntegrations(req: Request, res: Response) {
    try {
      const integrations = IntegrationManager.getInstance().getAllIntegrations();
      
      res.status(200).json({
        success: true,
        data: integrations
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  },

  async getIntegrationStatus(req: Request, res: Response) {
    try {
      const { integrationId } = req.params;
      const status = IntegrationManager.getInstance().getIntegrationStatus(integrationId);
      
      res.status(200).json({
        success: true,
        data: { status }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  },

  async createPlaidLinkToken(req: Request, res: Response) {
    try {
      const { integrationId } = req.params;
      const linkToken = await IntegrationManager.getInstance().createPlaidLinkToken(integrationId);
      
      res.status(200).json({
        success: true,
        data: { linkToken }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  },

  async getAccountBalance(req: Request, res: Response) {
    try {
      const { integrationId, accountId } = req.params;
      const balance = await IntegrationManager.getInstance().getAccountBalance(integrationId, accountId);
      
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

  async getSupportedIntegrations(_req: Request, res: Response) {
    try {
      // Return list of supported integration types and providers
      res.status(200).json({
        success: true,
        data: {
          types: Object.values(IntegrationType),
          providers: Object.values(IntegrationProvider)
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
};
