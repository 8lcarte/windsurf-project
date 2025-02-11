import { api } from './api';

export interface Budget {
  id: string;
  userId: string;
  category: string;
  targetAmount: number;
  period: 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface CreateBudgetData {
  category: string;
  targetAmount: number;
  period: 'monthly' | 'quarterly' | 'yearly';
}

export const budgetsApi = {
  getAll: () => api.get<Budget[]>('/budgets'),
  
  create: (data: CreateBudgetData) =>
    api.post<Budget>('/budgets', data),
  
  update: (id: string, targetAmount: number) =>
    api.patch<Budget>(`/budgets/${id}`, { targetAmount }),
  
  delete: (id: string) =>
    api.delete(`/budgets/${id}`),
};
