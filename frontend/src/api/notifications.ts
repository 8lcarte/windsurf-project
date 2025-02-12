import { api } from './api';

export interface Notification {
  id: string;
  userId: string;
  type: 'budget_alert' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const notificationsApi = {
  getAll: async () => {
    const response = await api.get<ApiResponse<Notification[]>>('/notifications');
    return response.data;
  },
  
  markAsRead: async (id: string) => {
    const response = await api.patch<ApiResponse<Notification>>(`/notifications/${id}/read`);
    return response.data.data;
  },
  
  delete: async (id: string) => {
    const response = await api.delete<ApiResponse<void>>(`/notifications/${id}`);
    return response.data.success;
  },
};
