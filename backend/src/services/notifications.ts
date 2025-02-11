interface Notification {
  id: string;
  userId: string;
  type: 'budget_alert' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// Mock notifications storage
let notifications: Notification[] = [];

export const notificationService = {
  createBudgetAlert: (
    userId: string,
    category: string,
    percentage: number,
    spent: number,
    total: number
  ): Notification => {
    const notification: Notification = {
      id: Math.random().toString(36).substring(7),
      userId,
      type: 'budget_alert',
      title: `Budget Alert: ${category}`,
      message: `You've spent ${percentage}% (${formatCurrency(spent)}) of your ${formatCurrency(total)} budget for ${category}.`,
      read: false,
      createdAt: new Date().toISOString(),
    };

    notifications.push(notification);
    return notification;
  },

  getUserNotifications: (userId: string): Notification[] => {
    return notifications.filter(n => n.userId === userId);
  },

  markAsRead: (userId: string, notificationId: string): void => {
    const notification = notifications.find(
      n => n.id === notificationId && n.userId === userId
    );
    if (notification) {
      notification.read = true;
    }
  },

  deleteNotification: (userId: string, notificationId: string): void => {
    notifications = notifications.filter(
      n => !(n.id === notificationId && n.userId === userId)
    );
  },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}
