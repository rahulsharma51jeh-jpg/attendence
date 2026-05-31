const API_BASE = '/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (response.status === 401 || response.status === 403) {
      this.clearToken();
      window.location.href = '/login';
      throw new Error('Authentication required');
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  // Auth
  login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  register(data) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  registerFace(faceDescriptor) {
    return this.request('/auth/face-register', {
      method: 'POST',
      body: JSON.stringify({ faceDescriptor })
    });
  }

  getMe() {
    return this.request('/auth/me');
  }

  // Attendance
  checkIn(data) {
    return this.request('/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  checkOut() {
    return this.request('/attendance/check-out', {
      method: 'POST'
    });
  }

  getLiveAttendance() {
    return this.request('/attendance/live');
  }

  getMyStatus() {
    return this.request('/attendance/my-status');
  }

  getAttendanceHistory(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/attendance/history?${query}`);
  }

  // Geofence
  verifyGeofence(latitude, longitude) {
    return this.request('/geofence/verify', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude })
    });
  }

  trackLocation(latitude, longitude) {
    return this.request('/geofence/track', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude })
    });
  }

  getLocationHistory(teacherId) {
    const query = teacherId ? `?teacherId=${teacherId}` : '';
    return this.request(`/geofence/location-history${query}`);
  }

  // Notifications
  getNotifications() {
    return this.request('/notifications');
  }

  markNotificationRead(id) {
    return this.request(`/notifications/${id}/read`, { method: 'PUT' });
  }

  markAllRead() {
    return this.request('/notifications/read-all', { method: 'PUT' });
  }

  triggerNotification() {
    return this.request('/notifications/trigger', { method: 'POST' });
  }

  // Schools
  getSchools() {
    return this.request('/schools');
  }

  getSchool(id) {
    return this.request(`/schools/${id}`);
  }
}

const api = new ApiService();
export default api;
