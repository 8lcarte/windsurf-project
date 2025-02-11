import { api } from './api';

export interface VirtualCard {
  id: string;
  userId: string;
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
  merchantCategories?: string[];
}

export const virtualCardsApi = {
  getCards: async () => {
    const response = await api.get<VirtualCard[]>('/virtual-cards');
    return response;
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
};
