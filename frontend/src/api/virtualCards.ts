import { api } from './api';

export interface VirtualCard {
  id: string;
  userId: string;
  customerId: string;
  name: string;
  number: string;
  lastFour: string;
  expiryDate: string;
  cvv: string;
  status: 'active' | 'frozen' | 'canceled';
  balance: number;
  spendLimit: number;
  frozen: boolean;
  transactions: Transaction[];
  merchantControls: {
    allowedCategories: string[];
    blockedCategories: string[];
    maxAmountPerMerchant?: Record<string, number>;
  };
  metadata?: {
    agent_name?: string;
    agent_description?: string;
    department?: string;
    billing_cycle?: string;
    trip_id?: string;
    po_number?: string;
    [key: string]: any;
  };
  createdAt: string;
}

export interface Transaction {
  id: string;
  date: string;
  merchantName: string;
  amount: number;
  status: 'completed' | 'pending' | 'declined';
  category: string;
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

export const virtualCardsApi = {
  getCards: async () => {
    const response = await api.get<VirtualCard[]>('/virtual-cards');
    return response.data;
  },

  createCard: (data: CreateCardData) =>
    api.post<VirtualCard>('/virtual-cards', data),

  getCard: (id: string) =>
    api.get<VirtualCard>(`/virtual-cards/${id}`),

  getCardNumber: (id: string) =>
    api.post<{ number: string; cvv: string }>(`/virtual-cards/${id}/number`),

  updateStatus: (id: string, frozen: boolean) =>
    api.patch<VirtualCard>(`/virtual-cards/${id}/status`, { frozen }),

  updateLimit: (id: string, spendLimit: number) =>
    api.patch<VirtualCard>(`/virtual-cards/${id}/limit`, { spendLimit }),
    
  updateMerchantControls: (id: string, data: {
    allowedCategories: string[];
    blockedCategories: string[];
    maxAmountPerMerchant?: Record<string, number>;
  }) =>
    api.patch<VirtualCard>(`/virtual-cards/${id}/merchant-controls`, data),

  updateCardAssociation: (id: string, data: UpdateCardAssociationData) =>
    api.patch<VirtualCard>(`/virtual-cards/${id}/association`, data),
};
