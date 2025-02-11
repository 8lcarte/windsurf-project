import { IntegrationManager } from '../integrations/integrationManager';
import { IntegrationType } from '../integrations/types';

export interface FundingSource {
  id: string;
  type: 'paypal' | 'venmo' | 'cashapp';
  name: string;
  status: 'active' | 'inactive' | 'failed';
  metadata: Record<string, any>;
}

export interface FundingRequest {
  cardId: string;
  amount: number;
  currency: string;
  sourceId: string;
  description?: string;
}

export interface FundingResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  status: 'completed' | 'pending' | 'failed';
  metadata: Record<string, any>;
}

export class FundingService {
  private static instance: FundingService;
  private integrationManager: IntegrationManager;

  private constructor() {
    this.integrationManager = IntegrationManager.getInstance();
  }

  static getInstance(): FundingService {
    if (!FundingService.instance) {
      FundingService.instance = new FundingService();
    }
    return FundingService.instance;
  }

  async addFunds(request: FundingRequest): Promise<FundingResult> {
    const source = await this.getFundingSource(request.sourceId);
    
    try {
      switch (source.type) {
        case 'paypal':
          return await this.processPayPal(source, request);
        default:
          throw new Error(`Unsupported funding source type: ${source.type}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: 'failed',
        metadata: {}
      };
    }
  }

  async validateFundingSource(sourceId: string): Promise<boolean> {
    const source = await this.getFundingSource(sourceId);
    
    switch (source.type) {
      case 'plaid_ach':
        const plaidIntegration = await this.getPlaidIntegration(source.metadata.integrationId);
        return plaidIntegration.testConnection();
      
      case 'paypal':
        const paypalIntegration = await this.getPayPalIntegration(source.metadata.integrationId);
        return paypalIntegration.testConnection();
      
      default:
        return false;
    }
  }

  private async processPlaindACH(source: FundingSource, request: FundingRequest): Promise<FundingResult> {
    const plaidIntegration = await this.getPlaidIntegration(source.metadata.integrationId);
    
    // Verify sufficient balance
    const balance = await plaidIntegration.getBalance(source.metadata.accountId);
    if (balance < request.amount) {
      throw new Error('Insufficient funds in linked bank account');
    }

    // Initiate ACH transfer
    // Note: This is a placeholder. You'll need to implement actual ACH transfer logic
    const transferResult = await plaidIntegration.initiateTransfer({
      accountId: source.metadata.accountId,
      amount: request.amount,
      description: request.description || 'Card funding via ACH'
    });

    return {
      success: true,
      transactionId: transferResult.id,
      status: 'pending', // ACH transfers are not instant
      metadata: {
        estimatedArrival: transferResult.estimatedArrival,
        sourceAccount: transferResult.accountId
      }
    };
  }

  private async processPayPal(source: FundingSource, request: FundingRequest): Promise<FundingResult> {
    const paypalIntegration = await this.getPayPalIntegration(source.metadata.integrationId);
    
    // Create PayPal payment
    const paymentResult = await paypalIntegration.createPayment({
      amount: request.amount,
      currency: request.currency,
      description: request.description || 'Card funding via PayPal'
    });

    return {
      success: true,
      transactionId: paymentResult.id,
      status: paymentResult.status === 'COMPLETED' ? 'completed' : 'pending',
      metadata: {
        paypalTransactionId: paymentResult.id,
        payerEmail: paymentResult.payerEmail
      }
    };
  }

  private async getFundingSource(sourceId: string): Promise<FundingSource> {
    // This would typically fetch from your database
    // For now, we'll throw an error if the source isn't found
    const source = await this.fetchFundingSource(sourceId);
    if (!source) {
      throw new Error('Funding source not found');
    }
    return source;
  }

  private async getPlaidIntegration(integrationId: string): Promise<PlaidIntegration> {
    const integration = this.integrationManager.getIntegration(integrationId) as PlaidIntegration;
    if (!integration || !(integration instanceof PlaidIntegration)) {
      throw new Error('Invalid Plaid integration');
    }
    return integration;
  }

  private async getPayPalIntegration(integrationId: string): Promise<PayPalIntegration> {
    const integration = this.integrationManager.getIntegration(integrationId) as PayPalIntegration;
    if (!integration || !(integration instanceof PayPalIntegration)) {
      throw new Error('Invalid PayPal integration');
    }
    return integration;
  }

  private async fetchFundingSource(sourceId: string): Promise<FundingSource | null> {
    // This would typically be a database query
    // For now, return a mock source for testing
    return {
      id: sourceId,
      type: 'paypal',
      name: 'PayPal Account',
      status: 'active',
      metadata: {
        integrationId: 'test_integration'
      }
    };
  }
}
