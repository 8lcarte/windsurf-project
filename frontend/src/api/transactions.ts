import { api } from './api';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  type: 'debit' | 'credit';
  cardId?: string;
  merchantName?: string;
  category?: string;
  notes?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const transactionsApi = {
  getAll: async () => {
    const response = await api.get<ApiResponse<Transaction[]>>('/transactions');
    return response.data.data;
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse<Transaction>>(`/transactions/${id}`);
    return response.data.data;
  },

  getByCardId: async (cardId: string) => {
    const response = await api.get<ApiResponse<Transaction[]>>(`/cards/${cardId}/transactions`);
    return response.data.data;
  },

  getByAgentId: async (agentId: string) => {
    const response = await api.get<ApiResponse<Transaction[]>>(`/agents/${agentId}/transactions`);
    return response.data.data;
  }
};