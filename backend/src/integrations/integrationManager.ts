import { 
  IntegrationConfig, 
  IntegrationProvider, 
  IntegrationStatus,
  IntegrationType,
  SyncResult,
  FundingSource
} from './types';
import { PayPalIntegration } from './providers/paypal';
import { VenmoIntegration } from './providers/venmo';
import { CashAppIntegration } from './providers/cashapp';

export class IntegrationManager {
  private static instance: IntegrationManager;
  private integrations: Map<string, IntegrationProvider> = new Map();
  private configs: Map<string, IntegrationConfig> = new Map();
  private fundingSources: Map<string, FundingSource[]> = new Map();

  private constructor() {}

  static getInstance(): IntegrationManager {
    if (!IntegrationManager.instance) {
      IntegrationManager.instance = new IntegrationManager();
    }
    return IntegrationManager.instance;
  }

  async addIntegration(config: IntegrationConfig): Promise<void> {
    try {
      const provider = this.createProviderInstance(config.provider);
      await provider.connect(config);
      
      this.integrations.set(config.id, provider);
      this.configs.set(config.id, {
        ...config,
        status: IntegrationStatus.ACTIVE
      });
    } catch (error) {
      this.configs.set(config.id, {
        ...config,
        status: IntegrationStatus.ERROR
      });
      throw error;
    }
  }

  // Funding source methods
  async getFundingSources(userId: string): Promise<FundingSource[]> {
    return this.fundingSources.get(userId) || [];
  }

  async getPayPalAuthUrl(state: string): Promise<string> {
    const paypal = new PayPalIntegration();
    return paypal.getAuthUrl(state);
  }

  async getVenmoAuthUrl(state: string): Promise<string> {
    const venmo = new VenmoIntegration();
    return venmo.getAuthUrl(state);
  }

  async getCashAppAuthUrl(state: string): Promise<string> {
    const cashapp = new CashAppIntegration();
    return cashapp.getAuthUrl(state);
  }

  async handlePayPalCallback(code: string, userId: string): Promise<void> {
    const paypal = new PayPalIntegration();
    const tokenData = await paypal.handleCallback(code);
    
    const fundingSource: FundingSource = {
      id: `paypal_${Date.now()}`,
      userId,
      provider: 'paypal',
      connected: true,
      accountId: tokenData.accountId,
      lastUsed: new Date().toISOString()
    };

    this.addFundingSource(userId, fundingSource);
  }

  async handleVenmoCallback(code: string, userId: string): Promise<void> {
    const venmo = new VenmoIntegration();
    const tokenData = await venmo.handleCallback(code);
    
    const fundingSource: FundingSource = {
      id: `venmo_${Date.now()}`,
      userId,
      provider: 'venmo',
      connected: true,
      accountId: tokenData.accountId,
      lastUsed: new Date().toISOString()
    };

    this.addFundingSource(userId, fundingSource);
  }

  async handleCashAppCallback(code: string, userId: string): Promise<void> {
    const cashapp = new CashAppIntegration();
    const tokenData = await cashapp.handleCallback(code);
    
    const fundingSource: FundingSource = {
      id: `cashapp_${Date.now()}`,
      userId,
      provider: 'cashapp',
      connected: true,
      accountId: tokenData.accountId,
      lastUsed: new Date().toISOString()
    };

    this.addFundingSource(userId, fundingSource);
  }

  async disconnectFundingSource(sourceId: string, userId: string): Promise<void> {
    const sources = this.fundingSources.get(userId) || [];
    const updatedSources = sources.filter(source => source.id !== sourceId);
    this.fundingSources.set(userId, updatedSources);
  }

  private addFundingSource(userId: string, source: FundingSource): void {
    const sources = this.fundingSources.get(userId) || [];
    sources.push(source);
    this.fundingSources.set(userId, sources);
  }

  async removeIntegration(integrationId: string): Promise<void> {
    const provider = this.integrations.get(integrationId);
    if (provider) {
      await provider.disconnect();
      this.integrations.delete(integrationId);
      this.configs.delete(integrationId);
    }
  }

  async syncIntegration(integrationId: string, since?: Date): Promise<SyncResult> {
    const provider = this.integrations.get(integrationId);
    if (!provider) {
      throw new Error('Integration not found');
    }

    try {
      // Sync expenses
      const expenseResult = await provider.syncExpenses(since);
      
      // Sync categories
      const categoryResult = await provider.syncCategories();

      const config = this.configs.get(integrationId);
      if (config) {
        this.configs.set(integrationId, {
          ...config,
          lastSyncTime: new Date(),
          status: IntegrationStatus.ACTIVE
        });
      }

      return {
        success: expenseResult.success && categoryResult.success,
        syncedItems: expenseResult.syncedItems + categoryResult.syncedItems,
        details: {
          expenses: expenseResult.details,
          categories: categoryResult.details
        }
      };
    } catch (error) {
      const config = this.configs.get(integrationId);
      if (config) {
        this.configs.set(integrationId, {
          ...config,
          status: IntegrationStatus.ERROR
        });
      }
      throw error;
    }
  }

  async createExpenseReport(integrationId: string, report: any): Promise<string> {
    const provider = this.integrations.get(integrationId);
    if (!provider) {
      throw new Error('Integration not found');
    }
    return provider.createExpenseReport(report);
  }

  getIntegrationStatus(integrationId: string): IntegrationStatus {
    return this.configs.get(integrationId)?.status || IntegrationStatus.INACTIVE;
  }

  getIntegrationConfig(integrationId: string): IntegrationConfig | undefined {
    return this.configs.get(integrationId);
  }

  getAllIntegrations(): IntegrationConfig[] {
    return Array.from(this.configs.values());
  }

  private createProviderInstance(provider: string): IntegrationProvider {
    switch (provider) {
      case 'plaid':
        return new PlaidIntegration();
      default:
        throw new Error(`Unsupported integration provider: ${provider}`);
    }
  }

  // Plaid-specific methods
  async createPlaidLinkToken(integrationId: string): Promise<string> {
    const provider = this.integrations.get(integrationId) as PlaidIntegration;
    if (!provider || !(provider instanceof PlaidIntegration)) {
      throw new Error('Invalid Plaid integration');
    }
    return provider.createLinkToken();
  }

  async getAccountBalance(integrationId: string, accountId: string): Promise<number> {
    const provider = this.integrations.get(integrationId) as PlaidIntegration;
    if (!provider || !(provider instanceof PlaidIntegration)) {
      throw new Error('Invalid Plaid integration');
    }
    return provider.getBalance(accountId);
  }
}
