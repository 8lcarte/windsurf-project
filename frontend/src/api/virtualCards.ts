import { api } from './api';

export interface Transaction {
  id: string;
  date: string;
  merchantName: string;
  amount: number;
  status: 'completed' | 'pending' | 'declined';
  category: string;
  description: string;
  type: 'credit' | 'debit';
}

export interface AgentMetadata {
  agent_name: string;
  agent_type: string;
  department: string;
  billing_cycle?: string;
  trip_id?: string;
  po_number?: string;
  [key: string]: any;
}

export interface VirtualCard {
  id: string;
  userId: string;
  customerId: string;
  name: string;
  number: string;
  lastFour: string;
  expiryDate: string;
  cvv: string;
  status: 'active' | 'inactive' | 'frozen' | 'expired';
  balance: number;
  spendLimit: number;
  frozen: boolean;
  transactions: Transaction[];
  merchantControls: {
    allowedCategories: string[];
    blockedCategories: string[];
    maxAmountPerMerchant?: Record<string, number>;
  };
  metadata: AgentMetadata;
  createdAt: string;
}

export interface CreateCardData {
  name: string;
  spendLimit: number;
  customerId: string;
  agentName: string;
  merchantCategories?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateCardAssociationData {
  customerId?: string;
  agentName?: string;
  metadata?: Record<string, any>;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const virtualCardsApi = {
  getCards: async () => {
    try {
      const response = await api.get<ApiResponse<VirtualCard[]>>('/api/v1/virtual-cards');
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching virtual cards:', error);
      return [];
    }
  },

  createCard: async (data: CreateCardData) => {
    try {
      const response = await api.post<ApiResponse<VirtualCard>>('/api/v1/virtual-cards', data);
      return response.data.data;
    } catch (error) {
      console.error('Error creating virtual card:', error);
      throw error;
    }
  },

  getCard: async (id: string) => {
    try {
      const response = await api.get<ApiResponse<VirtualCard>>(`/api/v1/virtual-cards/${id}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching virtual card:', error);
      throw error;
    }
  },

  getCardNumber: async (id: string) => {
    try {
      const response = await api.post<ApiResponse<{ number: string; cvv: string }>>(`/api/v1/virtual-cards/${id}/number`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching card number:', error);
      throw error;
    }
  },

  updateStatus: async (id: string, frozen: boolean) => {
    try {
      const response = await api.patch<ApiResponse<VirtualCard>>(`/api/v1/virtual-cards/${id}/status`, { frozen });
      return response.data.data;
    } catch (error) {
      console.error('Error updating card status:', error);
      throw error;
    }
  },

  updateLimit: async (id: string, spendLimit: number) => {
    try {
      const response = await api.patch<ApiResponse<VirtualCard>>(`/api/v1/virtual-cards/${id}/limit`, { spendLimit });
      return response.data.data;
    } catch (error) {
      console.error('Error updating spend limit:', error);
      throw error;
    }
  },
    
  updateMerchantControls: async (id: string, data: {
    allowedCategories: string[];
    blockedCategories: string[];
    maxAmountPerMerchant?: Record<string, number>;
  }) => {
    try {
      const response = await api.patch<ApiResponse<VirtualCard>>(`/api/v1/virtual-cards/${id}/merchant-controls`, data);
      return response.data.data;
    } catch (error) {
      console.error('Error updating merchant controls:', error);
      throw error;
    }
  },

  updateCardAssociation: async (id: string, data: UpdateCardAssociationData) => {
    try {
      const response = await api.patch<ApiResponse<VirtualCard>>(`/api/v1/virtual-cards/${id}/association`, data);
      return response.data.data;
    } catch (error) {
      console.error('Error updating card association:', error);
      throw error;
    }
  },
};
