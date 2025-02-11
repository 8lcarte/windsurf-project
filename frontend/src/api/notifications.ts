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

export const notificationsApi = {
  getAll: () => api.get<Notification[]>('/notifications'),
  
  markAsRead: (id: string) =>
    api.patch(`/notifications/${id}/read`),
  
  delete: (id: string) =>
    api.delete(`/notifications/${id}`),
};
