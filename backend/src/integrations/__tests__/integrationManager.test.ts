import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { IntegrationManager } from '../integrationManager';
import { 
  IntegrationConfig, 
  IntegrationStatus, 
  FundingSource,
  SyncResult,
  IntegrationType,
  IntegrationProvider,
  ExpenseReport
} from '../types';
import { PayPalIntegration } from '../providers/paypal';
import { VenmoIntegration } from '../providers/venmo';
import { CashAppIntegration } from '../providers/cashapp';

// Mock the provider classes
vi.mock('../providers/paypal');
vi.mock('../providers/venmo');
vi.mock('../providers/cashapp');

describe('IntegrationManager', () => {
  let manager: IntegrationManager;

  beforeEach(() => {
    // Reset singleton instance
    (IntegrationManager as any).instance = null;
    manager = IntegrationManager.getInstance();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = IntegrationManager.getInstance();
      const instance2 = IntegrationManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Integration Management', () => {
    const mockConfig: IntegrationConfig = {
      id: 'test-integration',
      name: 'Test Integration',
      type: IntegrationType.PAYPAL,
      provider: IntegrationProvider.PAYPAL,
      credentials: {
        clientId: 'test-client',
        secret: 'test-secret'
      },
      settings: {},
      status: IntegrationStatus.INACTIVE
    };

    const mockProvider = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      testConnection: vi.fn().mockResolvedValue(true),
      syncExpenses: vi.fn().mockResolvedValue({ success: true, syncedItems: 0 }),
      syncCategories: vi.fn().mockResolvedValue({ success: true, syncedItems: 0 }),
      createExpenseReport: vi.fn().mockResolvedValue('report-123'),
      updateExpenseReport: vi.fn().mockResolvedValue(undefined),
      getExpenseReport: vi.fn().mockResolvedValue({} as ExpenseReport),
      getCategories: vi.fn().mockResolvedValue([]),
      getMappingFields: vi.fn().mockResolvedValue({})
    };

    it('should add integration successfully', async () => {
      vi.spyOn(manager as any, 'createProviderInstance').mockReturnValue(mockProvider);
      await manager.addIntegration(mockConfig);
      const status = manager.getIntegrationStatus(mockConfig.id);
      expect(status).toBe(IntegrationStatus.ACTIVE);
    });

    it('should handle integration connection failure', async () => {
      const failConfig = { ...mockConfig, id: 'fail-integration' };
      const error = new Error('Connection failed');
      
      vi.spyOn(manager as any, 'createProviderInstance').mockReturnValue({
        ...mockProvider,
        connect: vi.fn().mockRejectedValue(error)
      });

      await expect(manager.addIntegration(failConfig)).rejects.toThrow(error);
      expect(manager.getIntegrationStatus(failConfig.id)).toBe(IntegrationStatus.ERROR);
    });

    it('should remove integration', async () => {
      vi.spyOn(manager as any, 'createProviderInstance').mockReturnValue(mockProvider);
      await manager.addIntegration(mockConfig);
      await manager.removeIntegration(mockConfig.id);
      
      expect(manager.getIntegrationConfig(mockConfig.id)).toBeUndefined();
    });

    it('should get all integrations', async () => {
      vi.spyOn(manager as any, 'createProviderInstance').mockReturnValue(mockProvider);
      await manager.addIntegration(mockConfig);
      const integrations = manager.getAllIntegrations();
      
      expect(integrations).toHaveLength(1);
      expect(integrations[0].id).toBe(mockConfig.id);
    });
  });

  describe('Funding Source Management', () => {
    const userId = 'test-user';
    const mockPayPalSource: FundingSource = {
      id: 'paypal_123',
      userId,
      provider: 'paypal',
      connected: true,
      accountId: 'pp-123',
      lastUsed: new Date().toISOString()
    };

    beforeEach(() => {
      // Reset funding sources for each test
      (manager as any).fundingSources = new Map();
      
      // Mock PayPal integration
      (PayPalIntegration as any).mockImplementation(() => ({
        getAuthUrl: vi.fn().mockResolvedValue('https://paypal.com/auth'),
        handleCallback: vi.fn().mockResolvedValue({ accountId: 'pp-123' })
      }));
    });

    it('should handle PayPal OAuth flow', async () => {
      const authUrl = await manager.getPayPalAuthUrl('test-state');
      expect(authUrl).toBe('https://paypal.com/auth');

      await manager.handlePayPalCallback('test-code', userId);
      const sources = await manager.getFundingSources(userId);
      
      expect(sources).toHaveLength(1);
      expect(sources[0].provider).toBe('paypal');
    });

    it('should disconnect funding source', async () => {
      // First add a funding source
      (manager as any).addFundingSource(userId, mockPayPalSource);
      
      // Verify it was added
      let sources = await manager.getFundingSources(userId);
      expect(sources).toHaveLength(1);
      
      // Disconnect the source
      await manager.disconnectFundingSource(mockPayPalSource.id, userId);
      
      // Verify it was removed
      sources = await manager.getFundingSources(userId);
      expect(sources).toHaveLength(0);
    });
  });

  describe('Sync Operations', () => {
    const mockConfig: IntegrationConfig = {
      id: 'sync-test',
      name: 'Sync Test',
      type: IntegrationType.PAYPAL,
      provider: IntegrationProvider.PAYPAL,
      credentials: {
        clientId: 'test-client',
        secret: 'test-secret'
      },
      settings: {},
      status: IntegrationStatus.INACTIVE
    };

    const mockSyncResult: SyncResult = {
      success: true,
      syncedItems: 10,
      details: {
        expenses: { added: 5, updated: 5 },
        categories: { added: 3, updated: 2 }
      }
    };

    const mockProvider = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      testConnection: vi.fn().mockResolvedValue(true),
      syncExpenses: vi.fn().mockResolvedValue({
        success: true,
        syncedItems: 5,
        details: { added: 5, updated: 5 }
      }),
      syncCategories: vi.fn().mockResolvedValue({
        success: true,
        syncedItems: 5,
        details: { added: 3, updated: 2 }
      }),
      createExpenseReport: vi.fn().mockResolvedValue('report-123'),
      updateExpenseReport: vi.fn().mockResolvedValue(undefined),
      getExpenseReport: vi.fn().mockResolvedValue({} as ExpenseReport),
      getCategories: vi.fn().mockResolvedValue([]),
      getMappingFields: vi.fn().mockResolvedValue({})
    };

    beforeEach(async () => {
      vi.spyOn(manager as any, 'createProviderInstance').mockReturnValue(mockProvider);
      await manager.addIntegration(mockConfig);
    });

    it('should sync integration successfully', async () => {
      const result = await manager.syncIntegration(mockConfig.id);
      
      expect(result.success).toBe(true);
      expect(result.syncedItems).toBe(10);
      expect(result.details).toEqual(mockSyncResult.details);
    });

    it('should update last sync time after successful sync', async () => {
      await manager.syncIntegration(mockConfig.id);
      const config = manager.getIntegrationConfig(mockConfig.id);
      
      expect(config?.lastSyncTime).toBeDefined();
      expect(config?.status).toBe(IntegrationStatus.ACTIVE);
    });

    it('should handle sync failure', async () => {
      const failProvider = {
        ...mockProvider,
        syncExpenses: vi.fn().mockRejectedValue(new Error('Sync failed'))
      };
      
      vi.spyOn(manager as any, 'createProviderInstance').mockReturnValue(failProvider);
      await manager.addIntegration({ ...mockConfig, id: 'fail-sync' });
      
      await expect(manager.syncIntegration('fail-sync')).rejects.toThrow('Sync failed');
      expect(manager.getIntegrationStatus('fail-sync')).toBe(IntegrationStatus.ERROR);
    });
  });
});