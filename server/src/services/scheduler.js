import cron from 'node-cron';
import prisma from '../config/database.js';
import { broadcastNotification, sendToUser } from './websocket.js';
import { getTodayDate, getCurrentCycle, getCycleLabel } from '../utils/helpers.js';

/**
 * Start the 2-hour attendance notification scheduler
 * Runs every 2 hours during school hours (8AM, 10AM, 12PM, 2PM, 4PM)
 */
export function startScheduler() {
  // Run every 2 hours from 8AM to 4PM on weekdays (Mon-Fri)
  cron.schedule('0 8,10,12,14,16 * * 1-5', async () => {
    console.log('⏰ Running 2-hour attendance notification cycle...');
    await sendAttendanceReminders();
  });

  // Also run a check every minute for demo purposes (can be disabled in production)
  // This helps verify the system is working
  cron.schedule('*/30 * * * *', async () => {
    const cycle = getCurrentCycle();
    if (cycle >= 1 && cycle <= 5) {
      console.log(`🔔 30-min check - Current cycle: ${cycle} (${getCycleLabel(cycle)})`);
    }
  });

  console.log('📅 Scheduler started - 2-hour attendance reminders active');
}

/**
 * Send attendance reminder notifications to all active teachers
 */
async function sendAttendanceReminders() {
  try {
    const today = getTodayDate();
    const cycle = getCurrentCycle();
    
    if (cycle < 1 || cycle > 5) {
      console.log('Outside school hours, skipping notification');
      return;
    }

    // Get all active teachers
    const teachers = await prisma.teacher.findMany({
      where: { status: 'active' },
      include: { school: true }
    });

    // Check who hasn't marked attendance for this cycle
    for (const teacher of teachers) {
      const existingRecord = await prisma.attendanceRecord.findUnique({
        where: {
          teacherId_date_cycle: {
            teacherId: teacher.id,
            date: today,
            cycle: cycle
          }
        }
      });

      if (!existingRecord) {
        // Create notification
        const notification = await prisma.notification.create({
          data: {
            teacherId: teacher.id,
            message: `Attendance reminder! Please mark your attendance for ${getCycleLabel(cycle)}. Use face verification to check in.`,
            type: 'attendance_reminder',
            scheduledFor: new Date()
          }
        });

        // Send real-time notification via WebSocket
        sendToUser(teacher.id, {
          type: 'notification',
          data: {
            id: notification.id,
            message: notification.message,
            type: notification.type,
            cycle: cycle,
            cycleLabel: getCycleLabel(cycle)
          }
        });

        console.log(`📨 Notification sent to ${teacher.name} for cycle ${cycle}`);
      }
    }

    // Broadcast system-wide update
    broadcastNotification({
      message: `Attendance cycle ${cycle} (${getCycleLabel(cycle)}) - Please mark attendance`,
      cycle,
      cycleLabel: getCycleLabel(cycle)
    });

  } catch (error) {
    console.error('Scheduler error:', error);
  }
}

/**
 * Manually trigger notification for testing
 */
export async function triggerManualNotification() {
  await sendAttendanceReminders();
}
