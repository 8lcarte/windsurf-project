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
    const response = await api.get<ApiResponse<VirtualCard[]>>('/virtual-cards');
    return response.data.data;
  },

  createCard: async (data: CreateCardData) => {
    const response = await api.post<ApiResponse<VirtualCard>>('/virtual-cards', data);
    return response.data.data;
  },

  getCard: async (id: string) => {
    const response = await api.get<ApiResponse<VirtualCard>>(`/virtual-cards/${id}`);
    return response.data.data;
  },

  getCardNumber: async (id: string) => {
    const response = await api.post<ApiResponse<{ number: string; cvv: string }>>(`/virtual-cards/${id}/number`);
    return response.data.data;
  },

  updateStatus: async (id: string, frozen: boolean) => {
    const response = await api.patch<ApiResponse<VirtualCard>>(`/virtual-cards/${id}/status`, { frozen });
    return response.data.data;
  },

  updateLimit: async (id: string, spendLimit: number) => {
    const response = await api.patch<ApiResponse<VirtualCard>>(`/virtual-cards/${id}/limit`, { spendLimit });
    return response.data.data;
  },
    
  updateMerchantControls: async (id: string, data: {
    allowedCategories: string[];
    blockedCategories: string[];
    maxAmountPerMerchant?: Record<string, number>;
  }) => {
    const response = await api.patch<ApiResponse<VirtualCard>>(`/virtual-cards/${id}/merchant-controls`, data);
    return response.data.data;
  },

  updateCardAssociation: async (id: string, data: UpdateCardAssociationData) => {
    const response = await api.patch<ApiResponse<VirtualCard>>(`/virtual-cards/${id}/association`, data);
    return response.data.data;
  },
};
