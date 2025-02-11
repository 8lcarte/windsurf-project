import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { 
  IntegrationProvider, 
  IntegrationConfig, 
  SyncResult,
  ExpenseReport,
  IntegrationError
} from '../types';

export class PlaidIntegration implements IntegrationProvider {
  private config: IntegrationConfig | null = null;
  private client: PlaidApi | null = null;
  private accessToken: string | null = null;

  async connect(config: IntegrationConfig): Promise<void> {
    this.config = config;
    
    const configuration = new Configuration({
      basePath: PlaidEnvironments.sandbox, // Change to production in prod
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': config.credentials.clientId,
          'PLAID-SECRET': config.credentials.secret,
        },
      },
    });

    this.client = new PlaidApi(configuration);
    this.accessToken = config.credentials.accessToken;

    // Verify the connection works
    const isValid = await this.testConnection();
    if (!isValid) {
      throw new Error('Failed to connect to Plaid');
    }
  }

  async disconnect(): Promise<void> {
    if (this.accessToken && this.client) {
      try {
        await this.client.itemRemove({
          access_token: this.accessToken
        });
      } catch (error) {
        console.error('Error disconnecting from Plaid:', error);
      }
    }
    this.config = null;
    this.client = null;
    this.accessToken = null;
  }

  async testConnection(): Promise<boolean> {
    if (!this.client || !this.accessToken) return false;

    try {
      const response = await this.client.accountsGet({
        access_token: this.accessToken
      });
      return response.data.accounts.length > 0;
    } catch (error) {
      return false;
    }
  }

  async syncExpenses(since?: Date): Promise<SyncResult> {
    if (!this.client || !this.accessToken) {
      throw new Error('Not connected to Plaid');
    }

    try {
      const startDate = since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
      const endDate = new Date();

      const response = await this.client.transactionsGet({
        access_token: this.accessToken,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        options: {
          include_personal_finance_category: true
        }
      });

      const transactions = response.data.transactions.map(transaction => ({
        id: transaction.transaction_id,
        amount: transaction.amount,
        date: transaction.date,
        merchant: transaction.merchant_name || '',
        category: transaction.personal_finance_category?.primary || 'uncategorized',
        description: transaction.name,
        pending: transaction.pending,
        accountId: transaction.account_id
      }));

      return {
        success: true,
        syncedItems: transactions.length,
        details: {
          transactions,
          accounts: response.data.accounts
        }
      };
    } catch (error) {
      return {
        success: false,
        syncedItems: 0,
        errors: [{
          code: 'SYNC_FAILED',
          message: error.message
        }]
      };
    }
  }

  async syncCategories(): Promise<SyncResult> {
    if (!this.client) {
      throw new Error('Not connected to Plaid');
    }

    try {
      const response = await this.client.categoriesGet({});
      
      return {
        success: true,
        syncedItems: response.data.categories.length,
        details: {
          categories: response.data.categories
        }
      };
    } catch (error) {
      return {
        success: false,
        syncedItems: 0,
        errors: [{
          code: 'CATEGORY_SYNC_FAILED',
          message: error.message
        }]
      };
    }
  }

  // Not applicable for Plaid, but implemented to satisfy interface
  async createExpenseReport(_report: ExpenseReport): Promise<string> {
    throw new Error('Expense reports not supported in Plaid integration');
  }

  async updateExpenseReport(_reportId: string, _report: ExpenseReport): Promise<void> {
    throw new Error('Expense reports not supported in Plaid integration');
  }

  async getExpenseReport(_reportId: string): Promise<ExpenseReport> {
    throw new Error('Expense reports not supported in Plaid integration');
  }

  async getCategories(): Promise<string[]> {
    const result = await this.syncCategories();
    if (!result.success || !result.details?.categories) {
      return [];
    }
    return result.details.categories.map(cat => cat.hierarchy.join(' > '));
  }

  async getMappingFields(): Promise<Record<string, string>> {
    return {
      'merchant': 'merchant_name',
      'amount': 'amount',
      'date': 'date',
      'category': 'personal_finance_category.primary',
      'description': 'name'
    };
  }

  // Additional Plaid-specific methods
  async getBalance(accountId: string): Promise<number> {
    if (!this.client || !this.accessToken) {
      throw new Error('Not connected to Plaid');
    }

    const response = await this.client.accountsGet({
      access_token: this.accessToken
    });

    const account = response.data.accounts.find(acc => acc.account_id === accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    return account.balances.current || 0;
  }

  async createLinkToken(): Promise<string> {
    if (!this.client) {
      throw new Error('Not connected to Plaid');
    }

    const response = await this.client.linkTokenCreate({
      user: { client_user_id: this.config?.id || 'default_user' },
      client_name: 'Windsurf',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en'
    });

    return response.data.link_token;
  }
}
