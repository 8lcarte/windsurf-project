import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { notificationService } from '../services/notifications';

const router = Router();

// Get user's notifications
router.get('/', authenticateToken, (req, res) => {
  const notifications = notificationService.getUserNotifications(req.user?.userId || '');
  res.json(notifications);
});

// Mark notification as read
router.patch('/:id/read', authenticateToken, (req, res) => {
  const { id } = req.params;
  notificationService.markAsRead(req.user?.userId || '', id);
  res.status(204).send();
});

// Delete notification
router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  notificationService.deleteNotification(req.user?.userId || '', id);
  res.status(204).send();
});

export default router;
