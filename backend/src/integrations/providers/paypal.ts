import * as paypal from '@paypal/checkout-server-sdk';
import { 
  IntegrationProvider, 
  IntegrationConfig, 
  SyncResult,
  ExpenseReport,
  IntegrationError
} from '../types';

interface PayPalPayment {
  id: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  amount: number;
  currency: string;
  payerEmail?: string;
  createTime: string;
}

interface PayPalPaymentRequest {
  amount: number;
  currency: string;
  description: string;
}

export class PayPalIntegration implements IntegrationProvider {
  private config: IntegrationConfig | null = null;
  private client: paypal.core.PayPalHttpClient | null = null;

  async connect(config: IntegrationConfig): Promise<void> {
    this.config = config;

    const environment = config.settings.sandbox
      ? new paypal.core.SandboxEnvironment(
          config.credentials.clientId,
          config.credentials.clientSecret
        )
      : new paypal.core.LiveEnvironment(
          config.credentials.clientId,
          config.credentials.clientSecret
        );

    this.client = new paypal.PayPalHttpClient(environment);

    const isValid = await this.testConnection();
    if (!isValid) {
      throw new Error('Failed to connect to PayPal');
    }
  }

  async disconnect(): Promise<void> {
    this.config = null;
    this.client = null;
  }

  async testConnection(): Promise<boolean> {
    if (!this.client) return false;

    try {
      // Verify credentials by attempting to get access token
      const request = new paypal.orders.OrdersCreateRequest();
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: '0.01'
          }
        }]
      });
      
      await this.client.execute(request);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Create a PayPal payment
  async createPayment(request: PayPalPaymentRequest): Promise<PayPalPayment> {
    if (!this.client) {
      throw new Error('Not connected to PayPal');
    }

    try {
      const orderRequest = new paypal.orders.OrdersCreateRequest();
      orderRequest.prefer("return=representation");
      orderRequest.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: request.currency,
            value: request.amount.toString()
          },
          description: request.description
        }]
      });

      const order = await this.client.execute(orderRequest);
      
      return {
        id: order.result.id,
        status: order.result.status as 'COMPLETED' | 'PENDING' | 'FAILED',
        amount: parseFloat(order.result.purchase_units[0].amount.value),
        currency: order.result.purchase_units[0].amount.currency_code,
        createTime: order.result.create_time
      };
    } catch (error) {
      throw new Error(`Failed to create PayPal payment: ${error.message}`);
    }
  }

  // Capture an authorized PayPal payment
  async capturePayment(orderId: string): Promise<PayPalPayment> {
    if (!this.client) {
      throw new Error('Not connected to PayPal');
    }

    try {
      const request = new paypal.orders.OrdersCaptureRequest(orderId);
      const capture = await this.client.execute(request);

      return {
        id: capture.result.id,
        status: capture.result.status as 'COMPLETED' | 'PENDING' | 'FAILED',
        amount: parseFloat(capture.result.purchase_units[0].payments.captures[0].amount.value),
        currency: capture.result.purchase_units[0].payments.captures[0].amount.currency_code,
        payerEmail: capture.result.payer?.email_address,
        createTime: capture.result.create_time
      };
    } catch (error) {
      throw new Error(`Failed to capture PayPal payment: ${error.message}`);
    }
  }

  // Required by IntegrationProvider interface but not used for PayPal
  async syncExpenses(_since?: Date): Promise<SyncResult> {
    return {
      success: true,
      syncedItems: 0,
      details: {
        message: 'PayPal integration does not support expense syncing'
      }
    };
  }

  async syncCategories(): Promise<SyncResult> {
    return {
      success: true,
      syncedItems: 0,
      details: {
        message: 'PayPal integration does not support category syncing'
      }
    };
  }

  async createExpenseReport(_report: ExpenseReport): Promise<string> {
    throw new Error('Expense reports not supported in PayPal integration');
  }

  async updateExpenseReport(_reportId: string, _report: ExpenseReport): Promise<void> {
    throw new Error('Expense reports not supported in PayPal integration');
  }

  async getExpenseReport(_reportId: string): Promise<ExpenseReport> {
    throw new Error('Expense reports not supported in PayPal integration');
  }

  async getCategories(): Promise<string[]> {
    return [];
  }

  async getMappingFields(): Promise<Record<string, string>> {
    return {
      'amount': 'amount.value',
      'currency': 'amount.currency_code',
      'status': 'status',
      'description': 'description'
    };
  }

  // Additional PayPal-specific methods
  async getPayPalBalance(): Promise<{ available: number; pending: number }> {
    if (!this.client) {
      throw new Error('Not connected to PayPal');
    }

    // Note: This would require the PayPal REST API, which is separate from the Checkout SDK
    // You would need to implement this using the PayPal REST API client
    throw new Error('Not implemented');
  }

  async createPaymentLink(request: PayPalPaymentRequest): Promise<string> {
    if (!this.client) {
      throw new Error('Not connected to PayPal');
    }

    const order = await this.createPayment(request);
    return `https://www.paypal.com/checkoutnow?token=${order.id}`;
  }
}
