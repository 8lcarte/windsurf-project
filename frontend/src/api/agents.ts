import { api } from './api';

export interface Agent {
  id: number;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'suspended';
  type: string;
  daily_spend_limit: number;
  current_daily_spend: number;
  monthly_spend_limit: number;
  current_monthly_spend: number;
  total_transactions: number;
  success_rate: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  last_transaction_at: string;
  created_at: string;
  openai_assistant_id?: string;
  allowed_merchant_categories: string[];
  blocked_merchant_categories: string[];
  allowed_merchants: string[];
  blocked_merchants: string[];
  behavioral_patterns: Array<{
    type: string;
    description: string;
    confidence: number;
    detected_at: string;
  }>;
  risk_metrics: {
    amount_volatility: number;
    merchant_diversity: number;
    time_regularity: number;
    success_rate: number;
  };
  recent_transactions: Array<{
    id: number;
    amount: number;
    merchant_name: string;
    merchant_category: string;
    status: string;
    risk_level: string;
    created_at: string;
  }>;
}

export interface CreateAgentData {
  name: string;
  description: string;
  type: string;
  status?: 'active' | 'inactive' | 'suspended';
  daily_spend_limit: number;
  monthly_spend_limit: number;
  allowed_merchant_categories?: string[];
  blocked_merchant_categories?: string[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const agentsApi = {
  getAgents: async () => {
    const response = await api.get<ApiResponse<Agent[]>>('/agents');
    return response.data.data;
  },

  getAgent: async (id: number) => {
    const response = await api.get<ApiResponse<Agent>>(`/agents/${id}`);
    return response.data.data;
  },

  createAgent: async (data: CreateAgentData) => {
    const response = await api.post<ApiResponse<Agent>>('/agents', data);
    return response.data.data;
  },

  updateAgent: async (id: number, data: Partial<CreateAgentData>) => {
    const response = await api.patch<ApiResponse<Agent>>(`/agents/${id}`, data);
    return response.data.data;
  },

  deleteAgent: async (id: number) => {
    const response = await api.delete<ApiResponse<void>>(`/agents/${id}`);
    return response.data.success;
  },

  // Analytics endpoints
  getAgentSpending: async (id: number) => {
    const response = await api.get<ApiResponse<any>>(`/agents/${id}/spending`);
    return response.data.data;
  },

  getAgentActivity: async (id: number) => {
    const response = await api.get<ApiResponse<any>>(`/agents/${id}/activity`);
    return response.data.data;
  },

  getAgentRisk: async (id: number) => {
    const response = await api.get<ApiResponse<any>>(`/agents/${id}/risk`);
    return response.data.data;
  },
}; 