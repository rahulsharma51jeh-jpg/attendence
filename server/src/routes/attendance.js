import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { isInsideGeofence } from '../utils/geofence.js';
import { getTodayDate, getCurrentCycle, getCycleLabel } from '../utils/helpers.js';
import { broadcastAttendanceUpdate, broadcastGeofenceAlert } from '../services/websocket.js';

const router = Router();

/**
 * POST /api/attendance/check-in
 * Mark attendance with face verification and location
 */
router.post('/check-in', authenticateToken, async (req, res) => {
  try {
    const { faceDescriptor, latitude, longitude } = req.body;
    const teacherId = req.user.id;
    const schoolId = req.user.schoolId;

    // Get teacher's stored face descriptor
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: { school: true }
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Verify face (compare descriptors)
    let faceVerified = false;
    if (teacher.faceDescriptor && faceDescriptor) {
      const storedDescriptor = JSON.parse(teacher.faceDescriptor);
      const distance = euclideanDistance(storedDescriptor, faceDescriptor);
      faceVerified = distance < 0.6; // Threshold for face match
    }

    if (!faceVerified && teacher.faceDescriptor) {
      return res.status(401).json({ 
        error: 'Face verification failed. Please try again with better lighting.',
        faceVerified: false 
      });
    }

    // Check geofence
    const school = teacher.school;
    const geofenceResult = isInsideGeofence(
      latitude, longitude,
      school.latitude, school.longitude,
      school.radiusMeters
    );

    const today = getTodayDate();
    const cycle = getCurrentCycle();

    if (cycle < 1 || cycle > 5) {
      return res.status(400).json({ error: 'Attendance can only be marked during school hours (8AM-6PM)' });
    }

    // Create or update attendance record
    const record = await prisma.attendanceRecord.upsert({
      where: {
        teacherId_date_cycle: {
          teacherId,
          date: today,
          cycle
        }
      },
      create: {
        teacherId,
        schoolId,
        checkInTime: new Date(),
        status: 'present',
        locationLat: latitude,
        locationLng: longitude,
        isInsideGeofence: geofenceResult.isInside,
        faceVerified,
        date: today,
        cycle
      },
      update: {
        checkInTime: new Date(),
        status: 'present',
        locationLat: latitude,
        locationLng: longitude,
        isInsideGeofence: geofenceResult.isInside,
        faceVerified
      }
    });

    // Log location
    await prisma.locationLog.create({
      data: {
        teacherId,
        latitude,
        longitude,
        isInsideGeofence: geofenceResult.isInside
      }
    });

    // Broadcast real-time update
    broadcastAttendanceUpdate({
      teacherId,
      teacherName: teacher.name,
      status: 'present',
      isInsideGeofence: geofenceResult.isInside,
      distance: geofenceResult.distance,
      faceVerified,
      cycle,
      cycleLabel: getCycleLabel(cycle),
      checkInTime: record.checkInTime
    });

    // If teacher is outside geofence, send alert
    if (!geofenceResult.isInside) {
      broadcastGeofenceAlert({
        teacherId,
        teacherName: teacher.name,
        distance: geofenceResult.distance,
        message: `${teacher.name} checked in from ${geofenceResult.distance}m away from school`
      });
    }

    res.json({
      success: true,
      record,
      geofence: geofenceResult,
      faceVerified,
      cycle,
      cycleLabel: getCycleLabel(cycle)
    });

  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Check-in failed' });
  }
});

/**
 * POST /api/attendance/check-out
 * Mark check-out for current cycle
 */
router.post('/check-out', authenticateToken, async (req, res) => {
  try {
    const teacherId = req.user.id;
    const today = getTodayDate();
    const cycle = getCurrentCycle();

    const record = await prisma.attendanceRecord.findUnique({
      where: {
        teacherId_date_cycle: {
          teacherId,
          date: today,
          cycle
        }
      }
    });

    if (!record) {
      return res.status(404).json({ error: 'No check-in found for current cycle' });
    }

    const updated = await prisma.attendanceRecord.update({
      where: { id: record.id },
      data: { checkOutTime: new Date() }
    });

    broadcastAttendanceUpdate({
      teacherId,
      status: 'checked_out',
      cycle,
      checkOutTime: updated.checkOutTime
    });

    res.json({ success: true, record: updated });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ error: 'Check-out failed' });
  }
});

/**
 * GET /api/attendance/live
 * Get real-time attendance status for all teachers (admin dashboard)
 */
router.get('/live', authenticateToken, async (req, res) => {
  try {
    const today = getTodayDate();
    const cycle = getCurrentCycle();
    const schoolId = req.user.schoolId;

    const teachers = await prisma.teacher.findMany({
      where: { schoolId, status: 'active' },
      include: {
        attendance: {
          where: { date: today },
          orderBy: { cycle: 'desc' }
        },
        locationLogs: {
          orderBy: { loggedAt: 'desc' },
          take: 1
        }
      }
    });

    const liveData = teachers.map(teacher => {
      const currentCycleRecord = teacher.attendance.find(a => a.cycle === cycle);
      const lastLocation = teacher.locationLogs[0];
      const todayRecords = teacher.attendance;

      let overallStatus = 'absent';
      if (currentCycleRecord) {
        overallStatus = currentCycleRecord.isInsideGeofence ? 'present_inside' : 'present_outside';
      }

      return {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        overallStatus,
        currentCycle: {
          cycle,
          cycleLabel: getCycleLabel(cycle),
          record: currentCycleRecord || null
        },
        todayRecords,
        lastLocation: lastLocation ? {
          latitude: lastLocation.latitude,
          longitude: lastLocation.longitude,
          isInsideGeofence: lastLocation.isInsideGeofence,
          loggedAt: lastLocation.loggedAt
        } : null,
        attendanceRate: todayRecords.filter(r => r.status === 'present').length + '/' + Math.min(cycle, 5)
      };
    });

    res.json({
      date: today,
      currentCycle: cycle,
      cycleLabel: getCycleLabel(cycle),
      totalTeachers: teachers.length,
      presentCount: liveData.filter(t => t.overallStatus !== 'absent').length,
      insideCount: liveData.filter(t => t.overallStatus === 'present_inside').length,
      outsideCount: liveData.filter(t => t.overallStatus === 'present_outside').length,
      absentCount: liveData.filter(t => t.overallStatus === 'absent').length,
      teachers: liveData
    });
  } catch (error) {
    console.error('Live attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch live attendance' });
  }
});

/**
 * GET /api/attendance/history
 * Get attendance history for a teacher or school
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { teacherId, startDate, endDate } = req.query;
    const targetTeacherId = teacherId || req.user.id;

    const where = { teacherId: targetTeacherId };
    if (startDate) where.date = { gte: startDate };
    if (endDate) where.date = { ...where.date, lte: endDate };

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: { teacher: { select: { name: true, email: true } } },
      orderBy: [{ date: 'desc' }, { cycle: 'asc' }]
    });

    res.json({ records });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

/**
 * GET /api/attendance/my-status
 * Get current teacher's attendance status for today
 */
router.get('/my-status', authenticateToken, async (req, res) => {
  try {
    const today = getTodayDate();
    const cycle = getCurrentCycle();

    const records = await prisma.attendanceRecord.findMany({
      where: {
        teacherId: req.user.id,
        date: today
      },
      orderBy: { cycle: 'asc' }
    });

    res.json({
      today,
      currentCycle: cycle,
      cycleLabel: getCycleLabel(cycle),
      records,
      totalMarked: records.length,
      totalCycles: Math.min(cycle, 5)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

/**
 * Calculate Euclidean distance between two face descriptors
 */
function euclideanDistance(desc1, desc2) {
  if (!desc1 || !desc2 || desc1.length !== desc2.length) return 999;
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    sum += Math.pow(desc1[i] - desc2[i], 2);
  }
  return Math.sqrt(sum);
}

export default router;
