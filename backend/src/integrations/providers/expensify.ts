import axios from 'axios';
import { 
  IntegrationProvider, 
  IntegrationConfig, 
  SyncResult, 
  ExpenseReport,
  IntegrationError
} from '../types';

export class ExpensifyIntegration implements IntegrationProvider {
  private config: IntegrationConfig | null = null;
  private apiKey: string | null = null;
  private baseUrl = 'https://integrations.expensify.com/Integration-Server/ExpensifyIntegrations';

  async connect(config: IntegrationConfig): Promise<void> {
    this.config = config;
    this.apiKey = config.credentials.apiKey;

    const isValid = await this.testConnection();
    if (!isValid) {
      throw new Error('Failed to connect to Expensify');
    }
  }

  async disconnect(): Promise<void> {
    this.config = null;
    this.apiKey = null;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest('Get', {
        test: true
      });
      return response.data.success === true;
    } catch (error) {
      return false;
    }
  }

  async syncExpenses(since?: Date): Promise<SyncResult> {
    try {
      const params: any = {
        type: 'expenses'
      };

      if (since) {
        params.startDate = since.toISOString().split('T')[0];
      }

      const response = await this.makeRequest('Get', params);
      
      if (!response.data.expenses) {
        return {
          success: true,
          syncedItems: 0
        };
      }

      // Transform Expensify expenses into our format
      const expenses = response.data.expenses.map(this.transformExpense);

      return {
        success: true,
        syncedItems: expenses.length,
        details: {
          expenses
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
    try {
      const response = await this.makeRequest('Get', {
        type: 'categories'
      });

      return {
        success: true,
        syncedItems: response.data.categories?.length || 0,
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

  async createExpenseReport(report: ExpenseReport): Promise<string> {
    try {
      const expensifyReport = this.transformReportToExpensify(report);
      const response = await this.makeRequest('CreateReport', expensifyReport);

      if (!response.data.reportID) {
        throw new Error('Failed to create report in Expensify');
      }

      return response.data.reportID;
    } catch (error) {
      throw new Error(`Failed to create expense report: ${error.message}`);
    }
  }

  async updateExpenseReport(reportId: string, report: ExpenseReport): Promise<void> {
    try {
      const expensifyReport = this.transformReportToExpensify(report);
      expensifyReport.reportID = reportId;

      await this.makeRequest('UpdateReport', expensifyReport);
    } catch (error) {
      throw new Error(`Failed to update expense report: ${error.message}`);
    }
  }

  async getExpenseReport(reportId: string): Promise<ExpenseReport> {
    try {
      const response = await this.makeRequest('Get', {
        type: 'report',
        reportID: reportId
      });

      if (!response.data.report) {
        throw new Error('Report not found');
      }

      return this.transformExpensifyReport(response.data.report);
    } catch (error) {
      throw new Error(`Failed to get expense report: ${error.message}`);
    }
  }

  async getCategories(): Promise<string[]> {
    const result = await this.syncCategories();
    if (!result.success || !result.details?.categories) {
      return [];
    }
    return result.details.categories;
  }

  async getMappingFields(): Promise<Record<string, string>> {
    return {
      'merchant': 'merchant',
      'amount': 'amount',
      'date': 'transactionDate',
      'category': 'category',
      'description': 'comment'
    };
  }

  private async makeRequest(type: string, params: Record<string, any>) {
    if (!this.apiKey) {
      throw new Error('Not connected to Expensify');
    }

    const response = await axios.post(this.baseUrl, {
      type,
      credentials: {
        partnerUserID: this.config?.credentials.partnerUserID,
        partnerUserSecret: this.apiKey
      },
      ...params
    });

    return response;
  }

  private transformExpense(expensifyExpense: any) {
    return {
      id: expensifyExpense.transactionID,
      amount: expensifyExpense.amount,
      merchant: expensifyExpense.merchant,
      date: new Date(expensifyExpense.transactionDate),
      category: expensifyExpense.category,
      description: expensifyExpense.comment
    };
  }

  private transformReportToExpensify(report: ExpenseReport) {
    return {
      title: report.title,
      submitter: report.submittedBy,
      transactionIDs: report.transactions,
      comment: report.description
    };
  }

  private transformExpensifyReport(expensifyReport: any): ExpenseReport {
    return {
      id: expensifyReport.reportID,
      title: expensifyReport.title,
      description: expensifyReport.comment,
      status: expensifyReport.status,
      submittedBy: expensifyReport.submitter,
      submittedDate: new Date(expensifyReport.submitted),
      totalAmount: expensifyReport.total,
      currency: expensifyReport.currency || 'USD',
      transactions: expensifyReport.transactionIDs || [],
      receipts: expensifyReport.receiptIDs || []
    };
  }
}
