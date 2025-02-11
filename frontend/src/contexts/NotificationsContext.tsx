import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSnackbar } from 'notistack';
import { Notification, notificationsApi } from '../api/notifications';

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refetchNotifications: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};

interface NotificationsProviderProps {
  children: React.ReactNode;
  pollingInterval?: number;
}

export function NotificationsProvider({
  children,
  pollingInterval = 30000, // Default to 30 seconds
}: NotificationsProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { enqueueSnackbar } = useSnackbar();

  const fetchNotifications = async () => {
    try {
      const response = await notificationsApi.getAll();
      const newNotifications = response.data;
      
      // Show snackbar for new unread notifications
      newNotifications.forEach(notification => {
        if (!notification.read && !notifications.find(n => n.id === notification.id)) {
          enqueueSnackbar(notification.message, {
            variant: notification.type === 'budget_alert' ? 'warning' : 'info',
            autoHideDuration: 6000,
            action: (key) => (
              <button
                onClick={() => {
                  markAsRead(notification.id);
                  // @ts-ignore - notistack types are not up to date
                  closeSnackbar(key);
                }}
              >
                Dismiss
              </button>
            ),
          });
        }
      });
      
      setNotifications(newNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Set up polling
    const interval = setInterval(fetchNotifications, pollingInterval);
    
    return () => clearInterval(interval);
  }, [pollingInterval]);

  const markAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await notificationsApi.delete(id);
      setNotifications(prev =>
        prev.filter(notification => notification.id !== id)
      );
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const value = {
    notifications,
    unreadCount,
    markAsRead,
    deleteNotification,
    refetchNotifications: fetchNotifications,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}
