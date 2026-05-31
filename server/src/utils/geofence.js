/**
 * Geofencing utility using Haversine formula
 * Calculates if a point is within a given radius of a center point
 */

const EARTH_RADIUS_METERS = 6371000;

/**
 * Convert degrees to radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @returns distance in meters
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return EARTH_RADIUS_METERS * c;
}

/**
 * Check if a teacher's location is within the school's geofence
 * @param {number} teacherLat - Teacher's latitude
 * @param {number} teacherLng - Teacher's longitude
 * @param {number} schoolLat - School's latitude
 * @param {number} schoolLng - School's longitude
 * @param {number} radiusMeters - School's geofence radius in meters
 * @returns {{ isInside: boolean, distance: number }}
 */
export function isInsideGeofence(teacherLat, teacherLng, schoolLat, schoolLng, radiusMeters) {
  const distance = calculateDistance(teacherLat, teacherLng, schoolLat, schoolLng);
  return {
    isInside: distance <= radiusMeters,
    distance: Math.round(distance)
  };
}

/**
 * Get human-readable status based on geofence check
 */
export function getGeofenceStatus(distance, radiusMeters) {
  if (distance <= radiusMeters) {
    return { status: 'inside', label: 'Inside School Premises', color: 'green' };
  } else if (distance <= radiusMeters * 1.5) {
    return { status: 'near', label: 'Near School Boundary', color: 'yellow' };
  } else {
    return { status: 'outside', label: 'Outside School Premises', color: 'red' };
  }
}
