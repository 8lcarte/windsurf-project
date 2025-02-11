export interface IntegrationConfig {
  id: string;
  name: string;
  type: IntegrationType;
  provider: IntegrationProvider;
  credentials: Record<string, string>;
  settings: Record<string, any>;
  status: IntegrationStatus;
  lastSyncTime?: Date;
}

export enum IntegrationType {
  PAYPAL = 'paypal',
  VENMO = 'venmo',
  CASHAPP = 'cashapp'
}

export enum IntegrationProvider {
  PAYPAL = 'paypal',
  VENMO = 'venmo',
  CASHAPP = 'cashapp'
}

export enum IntegrationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  CONFIGURING = 'configuring'
}

export interface IntegrationError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface FundingSource {
  id: string;
  userId: string;
  provider: 'paypal' | 'venmo' | 'cashapp';
  connected: boolean;
  accountId?: string;
  lastUsed?: string;
}

export interface SyncResult {
  success: boolean;
  syncedItems: number;
  errors?: IntegrationError[];
  details?: Record<string, any>;
}

export interface ExpenseReport {
  id: string;
  title: string;
  description?: string;
  status: string;
  submittedBy: string;
  submittedDate: Date;
  totalAmount: number;
  currency: string;
  transactions: string[]; // Array of transaction IDs
  receipts: string[]; // Array of receipt IDs
  metadata?: Record<string, any>;
}

// Base interface that all integration providers must implement
export interface IntegrationProvider {
  // Connection management
  connect(config: IntegrationConfig): Promise<void>;
  disconnect(): Promise<void>;
  testConnection(): Promise<boolean>;
  
  // Sync operations
  syncExpenses(since?: Date): Promise<SyncResult>;
  syncCategories(): Promise<SyncResult>;
  
  // Expense report operations
  createExpenseReport(report: ExpenseReport): Promise<string>; // Returns report ID
  updateExpenseReport(reportId: string, report: ExpenseReport): Promise<void>;
  getExpenseReport(reportId: string): Promise<ExpenseReport>;
  
  // Utility methods
  getCategories(): Promise<string[]>;
  getMappingFields(): Promise<Record<string, string>>;
}
