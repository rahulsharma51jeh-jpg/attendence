import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { triggerManualNotification } from '../services/scheduler.js';

const router = Router();

/**
 * GET /api/notifications
 * Get notifications for current teacher
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { teacherId: req.user.id },
      orderBy: { sentAt: 'desc' },
      take: 20
    });

    const unreadCount = await prisma.notification.count({
      where: { teacherId: req.user.id, isRead: false }
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { teacherId: req.user.id, isRead: false },
      data: { isRead: true }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

/**
 * POST /api/notifications/trigger
 * Manually trigger attendance notification (admin/testing)
 */
router.post('/trigger', authenticateToken, async (req, res) => {
  try {
    await triggerManualNotification();
    res.json({ success: true, message: 'Notifications triggered for current cycle' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger notifications' });
  }
});

export default router;
