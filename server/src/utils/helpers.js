/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get current 2-hour cycle number (1-5)
 * Cycle 1: 8:00-10:00
 * Cycle 2: 10:00-12:00
 * Cycle 3: 12:00-14:00
 * Cycle 4: 14:00-16:00
 * Cycle 5: 16:00-18:00
 * 
 * Uses SCHOOL_TIMEZONE env var (default: Asia/Kolkata for IST)
 * Set DEMO_MODE=true to always return cycle 1 (for testing)
 */
export function getCurrentCycle() {
  // Demo mode: always allow attendance
  if (process.env.DEMO_MODE === 'true') return 1;
  
  const timezone = process.env.SCHOOL_TIMEZONE || 'Asia/Kolkata';
  const now = new Date();
  const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const hour = localTime.getHours();
  
  if (hour < 8) return 0; // Before school
  if (hour >= 18) return 6; // After school
  
  return Math.floor((hour - 8) / 2) + 1;
}

/**
 * Get cycle time range label
 */
export function getCycleLabel(cycle) {
  const labels = {
    1: '8:00 AM - 10:00 AM',
    2: '10:00 AM - 12:00 PM',
    3: '12:00 PM - 2:00 PM',
    4: '2:00 PM - 4:00 PM',
    5: '4:00 PM - 6:00 PM'
  };
  return labels[cycle] || 'Unknown';
}

/**
 * Format date for display
 */
export function formatDateTime(date) {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
