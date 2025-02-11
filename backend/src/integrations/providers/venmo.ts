import axios from 'axios';
import { 
  IntegrationProvider, 
  IntegrationConfig, 
  SyncResult,
  ExpenseReport
} from '../types';

interface VenmoPayment {
  id: string;
  status: 'settled' | 'pending' | 'failed';
  amount: number;
  note: string;
  payerUsername?: string;
  createTime: string;
}

interface VenmoPaymentRequest {
  amount: number;
  note: string;
  recipientId?: string;
  recipientUsername?: string;
}

export class VenmoIntegration implements IntegrationProvider {
  private config: IntegrationConfig | null = null;
  private accessToken: string | null = null;
  private baseUrl: string = 'https://api.venmo.com/v1';

  async connect(config: IntegrationConfig): Promise<void> {
    this.config = config;
    this.accessToken = config.credentials.accessToken;

    const isValid = await this.testConnection();
    if (!isValid) {
      throw new Error('Failed to connect to Venmo');
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
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  // Create a payment request
  async createPayment(request: VenmoPaymentRequest): Promise<VenmoPayment> {
    if (!this.accessToken) {
      throw new Error('Not connected to Venmo');
    }

    try {
      const payload: any = {
        amount: request.amount,
        note: request.note,
        funding_source_id: 'balance' // Use Venmo balance by default
      };

      if (request.recipientId) {
        payload.user_id = request.recipientId;
      } else if (request.recipientUsername) {
        payload.phone_email_or_username = request.recipientUsername;
      } else {
        throw new Error('Either recipientId or recipientUsername must be provided');
      }

      const response = await axios.post(
        `${this.baseUrl}/payments`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return {
        id: response.data.data.payment.id,
        status: response.data.data.payment.status,
        amount: response.data.data.payment.amount,
        note: response.data.data.payment.note,
        payerUsername: response.data.data.actor.username,
        createTime: response.data.data.payment.date_created
      };
    } catch (error) {
      throw new Error(`Failed to create Venmo payment: ${error.message}`);
    }
  }

  // Get Venmo balance
  async getBalance(): Promise<number> {
    if (!this.accessToken) {
      throw new Error('Not connected to Venmo');
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/balance`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return response.data.data.balance;
    } catch (error) {
      throw new Error(`Failed to get Venmo balance: ${error.message}`);
    }
  }

  // Create a payment request link
  async createPaymentRequestLink(request: VenmoPaymentRequest): Promise<string> {
    const encodedAmount = encodeURIComponent(request.amount.toString());
    const encodedNote = encodeURIComponent(request.note);
    const username = this.config?.settings.username;
    
    if (!username) {
      throw new Error('Venmo username not configured');
    }

    return `venmo://paycharge?txn=pay&recipients=${username}&amount=${encodedAmount}&note=${encodedNote}`;
  }

  // Required IntegrationProvider methods
  async syncExpenses(_since?: Date): Promise<SyncResult> {
    return {
      success: true,
      syncedItems: 0,
      details: {
        message: 'Venmo integration does not support expense syncing'
      }
    };
  }

  async createExpenseReport(_report: ExpenseReport): Promise<string> {
    throw new Error('Expense reports not supported in Venmo integration');
  }

  async updateExpenseReport(_reportId: string, _report: ExpenseReport): Promise<void> {
    throw new Error('Expense reports not supported in Venmo integration');
  }

  async getExpenseReport(_reportId: string): Promise<ExpenseReport> {
    throw new Error('Expense reports not supported in Venmo integration');
  }

  async getCategories(): Promise<string[]> {
    return [];
  }

  async getMappingFields(): Promise<Record<string, string>> {
    return {
      'amount': 'amount',
      'note': 'note',
      'status': 'status',
      'payerUsername': 'actor.username'
    };
  }
}
