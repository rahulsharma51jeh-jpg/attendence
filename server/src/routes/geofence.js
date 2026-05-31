import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { isInsideGeofence, getGeofenceStatus } from '../utils/geofence.js';
import { broadcastGeofenceAlert } from '../services/websocket.js';

const router = Router();

/**
 * POST /api/geofence/verify
 * Verify if teacher's current location is within school geofence
 */
router.post('/verify', authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const teacherId = req.user.id;

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: { school: true }
    });

    if (!teacher || !teacher.school) {
      return res.status(404).json({ error: 'Teacher or school not found' });
    }

    const school = teacher.school;
    const result = isInsideGeofence(
      latitude, longitude,
      school.latitude, school.longitude,
      school.radiusMeters
    );

    const status = getGeofenceStatus(result.distance, school.radiusMeters);

    // Log the location
    await prisma.locationLog.create({
      data: {
        teacherId,
        latitude,
        longitude,
        isInsideGeofence: result.isInside
      }
    });

    // Alert if teacher goes outside
    if (!result.isInside) {
      broadcastGeofenceAlert({
        teacherId,
        teacherName: teacher.name,
        distance: result.distance,
        status: status.status,
        message: `⚠️ ${teacher.name} is ${result.distance}m away from school premises`
      });
    }

    res.json({
      isInside: result.isInside,
      distance: result.distance,
      status: status.status,
      label: status.label,
      color: status.color,
      school: {
        name: school.name,
        latitude: school.latitude,
        longitude: school.longitude,
        radius: school.radiusMeters
      }
    });
  } catch (error) {
    console.error('Geofence verify error:', error);
    res.status(500).json({ error: 'Geofence verification failed' });
  }
});

/**
 * GET /api/geofence/location-history
 * Get location history for a teacher
 */
router.get('/location-history', authenticateToken, async (req, res) => {
  try {
    const { teacherId } = req.query;
    const targetId = teacherId || req.user.id;

    const logs = await prisma.locationLog.findMany({
      where: { teacherId: targetId },
      orderBy: { loggedAt: 'desc' },
      take: 50,
      include: { teacher: { select: { name: true } } }
    });

    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch location history' });
  }
});

/**
 * POST /api/geofence/track
 * Continuously track teacher location (called periodically from frontend)
 */
router.post('/track', authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const teacherId = req.user.id;

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: { school: true }
    });

    const result = isInsideGeofence(
      latitude, longitude,
      teacher.school.latitude, teacher.school.longitude,
      teacher.school.radiusMeters
    );

    // Log location
    await prisma.locationLog.create({
      data: {
        teacherId,
        latitude,
        longitude,
        isInsideGeofence: result.isInside
      }
    });

    res.json({ tracked: true, isInside: result.isInside, distance: result.distance });
  } catch (error) {
    res.status(500).json({ error: 'Tracking failed' });
  }
});

export default router;
