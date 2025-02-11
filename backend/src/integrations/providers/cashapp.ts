import axios from 'axios';
import { 
  IntegrationProvider, 
  IntegrationConfig, 
  SyncResult,
  ExpenseReport
} from '../types';

interface CashAppPayment {
  id: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  amount: number;
  currency: string;
  note?: string;
  cashtag?: string;
  createTime: string;
}

interface CashAppPaymentRequest {
  amount: number;
  currency: string;
  note?: string;
  cashtag?: string;
}

export class CashAppIntegration implements IntegrationProvider {
  private config: IntegrationConfig | null = null;
  private accessToken: string | null = null;
  private baseUrl: string = 'https://api.cash.app/v1';

  async connect(config: IntegrationConfig): Promise<void> {
    this.config = config;
    this.accessToken = config.credentials.accessToken;

    const isValid = await this.testConnection();
    if (!isValid) {
      throw new Error('Failed to connect to Cash App');
    }
  }

  async disconnect(): Promise<void> {
    this.config = null;
    this.accessToken = null;
  }

  async testConnection(): Promise<boolean> {
    if (!this.accessToken) return false;

    try {
      const response = await axios.get(`${this.baseUrl}/me`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json'
        }
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  // Create a Cash App payment
  async createPayment(request: CashAppPaymentRequest): Promise<CashAppPayment> {
    if (!this.accessToken) {
      throw new Error('Not connected to Cash App');
    }

    try {
      const payload = {
        amount: request.amount,
        currency: request.currency,
        note: request.note,
        recipient: request.cashtag ? { cashtag: request.cashtag } : undefined
      };

      const response = await axios.post(
        `${this.baseUrl}/payments`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'application/json'
          }
        }
      );

      return {
        id: response.data.payment_id,
        status: response.data.status,
        amount: response.data.amount,
        currency: response.data.currency,
        note: response.data.note,
        cashtag: response.data.recipient?.cashtag,
        createTime: response.data.created_at
      };
    } catch (error) {
      throw new Error(`Failed to create Cash App payment: ${error.message}`);
    }
  }

  // Get Cash App balance
  async getBalance(): Promise<{ amount: number; currency: string }> {
    if (!this.accessToken) {
      throw new Error('Not connected to Cash App');
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/balance`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'application/json'
          }
        }
      );

      return {
        amount: response.data.balance,
        currency: response.data.currency
      };
    } catch (error) {
      throw new Error(`Failed to get Cash App balance: ${error.message}`);
    }
  }

  // Create a Cash App payment link
  async createPaymentLink(request: CashAppPaymentRequest): Promise<string> {
    const cashtag = this.config?.settings.cashtag;
    if (!cashtag) {
      throw new Error('Cash App $cashtag not configured');
    }

    const amount = request.amount.toFixed(2);
    const note = request.note ? encodeURIComponent(request.note) : '';
    
    return `https://cash.app/$${cashtag}/${amount}${note ? '?note=' + note : ''}`;
  }

  // Required IntegrationProvider methods
  async syncExpenses(_since?: Date): Promise<SyncResult> {
    return {
      success: true,
      syncedItems: 0,
      details: {
        message: 'Cash App integration does not support expense syncing'
      }
    };
  }

  async createExpenseReport(_report: ExpenseReport): Promise<string> {
    throw new Error('Expense reports not supported in Cash App integration');
  }

  async updateExpenseReport(_reportId: string, _report: ExpenseReport): Promise<void> {
    throw new Error('Expense reports not supported in Cash App integration');
  }

  async getExpenseReport(_reportId: string): Promise<ExpenseReport> {
    throw new Error('Expense reports not supported in Cash App integration');
  }

  async getCategories(): Promise<string[]> {
    return [];
  }

  async getMappingFields(): Promise<Record<string, string>> {
    return {
      'amount': 'amount',
      'currency': 'currency',
      'note': 'note',
      'status': 'status',
      'cashtag': 'recipient.cashtag'
    };
  }

  // Additional Cash App specific methods
  async validateCashtag(cashtag: string): Promise<boolean> {
    if (!this.accessToken) {
      throw new Error('Not connected to Cash App');
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/users/${cashtag}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'application/json'
          }
        }
      );
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}
