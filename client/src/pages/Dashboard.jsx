import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import wsService from '../services/websocket.js';
import {
  Users, UserCheck, UserX, MapPin, Bell, LogOut, RefreshCw,
  Clock, AlertTriangle, CheckCircle, Radio, Map
} from 'lucide-react';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [liveData, setLiveData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchLiveData = useCallback(async () => {
    try {
      const data = await api.getLiveAttendance();
      setLiveData(data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to fetch live data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, []);

  useEffect(() => {
    fetchLiveData();
    fetchNotifications();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchLiveData, 30000);

    // WebSocket listeners
    const unsubAttendance = wsService.subscribe('attendance_update', (msg) => {
      fetchLiveData();
    });

    const unsubGeofence = wsService.subscribe('geofence_alert', (msg) => {
      fetchLiveData();
      fetchNotifications();
    });

    const unsubNotification = wsService.subscribe('notification', () => {
      fetchNotifications();
    });

    return () => {
      clearInterval(interval);
      unsubAttendance();
      unsubGeofence();
      unsubNotification();
    };
  }, [fetchLiveData, fetchNotifications]);

  const handleTriggerNotification = async () => {
    try {
      await api.triggerNotification();
      alert('Attendance notifications sent to all teachers!');
    } catch (error) {
      alert('Failed to trigger notifications');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-red-500 pulse-dot" />
              <h1 className="text-xl font-bold text-slate-900">Live Attendance Panel</h1>
            </div>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              LIVE
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={fetchLiveData}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
              title="Refresh"
            >
              <RefreshCw size={18} />
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition relative"
              >
                <Bell size={18} />
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 z-50 max-h-96 overflow-y-auto">
                  <div className="p-3 border-b border-slate-100 flex justify-between items-center">
                    <span className="font-medium text-sm">Notifications</span>
                    <button onClick={() => api.markAllRead().then(fetchNotifications)} className="text-xs text-indigo-600">
                      Mark all read
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="p-4 text-sm text-slate-400 text-center">No notifications</p>
                  ) : (
                    notifications.slice(0, 10).map(n => (
                      <div key={n.id} className={`p-3 border-b border-slate-50 ${!n.isRead ? 'bg-indigo-50' : ''}`}>
                        <p className="text-sm text-slate-700">{n.message}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(n.sentAt).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            
            <span className="text-sm text-slate-600">{user?.name}</span>
            <button
              onClick={logout}
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatCard
            icon={<Users className="text-indigo-600" size={22} />}
            label="Total Teachers"
            value={liveData?.totalTeachers || 0}
            color="indigo"
          />
          <StatCard
            icon={<UserCheck className="text-green-600" size={22} />}
            label="Present (Inside)"
            value={liveData?.insideCount || 0}
            color="green"
          />
          <StatCard
            icon={<AlertTriangle className="text-yellow-600" size={22} />}
            label="Present (Outside)"
            value={liveData?.outsideCount || 0}
            color="yellow"
          />
          <StatCard
            icon={<UserX className="text-red-600" size={22} />}
            label="Absent"
            value={liveData?.absentCount || 0}
            color="red"
          />
          <StatCard
            icon={<Clock className="text-purple-600" size={22} />}
            label="Current Cycle"
            value={liveData?.currentCycle || '-'}
            subtitle={liveData?.cycleLabel}
            color="purple"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-800">Teacher Status</h2>
            <span className="text-xs text-slate-400">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          </div>
          <button
            onClick={handleTriggerNotification}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
          >
            <Bell size={16} />
            Send Attendance Reminder
          </button>
        </div>

        {/* Teacher Status Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Teacher</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Face Verified</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Today's Rate</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Last Check-in</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {liveData?.teachers?.map(teacher => (
                  <TeacherRow key={teacher.id} teacher={teacher} />
                ))}
                {(!liveData?.teachers || liveData.teachers.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No teachers registered yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* School Geofence Info */}
        {user?.school && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Map size={20} className="text-indigo-600" />
              School Geofence Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 uppercase font-medium">School</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">{user.school.name}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 uppercase font-medium">Location</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">
                  {user.school.latitude?.toFixed(4)}, {user.school.longitude?.toFixed(4)}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 uppercase font-medium">Radius</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">{user.school.radiusMeters}m</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 uppercase font-medium">2-Hour Cycles</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">5 cycles/day (8AM-6PM)</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, subtitle, color }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 bg-${color}-50 rounded-lg`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function TeacherRow({ teacher }) {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'present_inside':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle size={12} /> Inside
          </span>
        );
      case 'present_outside':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            <AlertTriangle size={12} /> Outside
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <UserX size={12} /> Absent
          </span>
        );
    }
  };

  return (
    <tr className="hover:bg-slate-50 transition">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium text-sm">
            {teacher.name.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">{teacher.name}</p>
            <p className="text-xs text-slate-400">{teacher.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">{getStatusBadge(teacher.overallStatus)}</td>
      <td className="px-4 py-3">
        {teacher.lastLocation ? (
          <div className="flex items-center gap-1">
            <MapPin size={14} className={teacher.lastLocation.isInsideGeofence ? 'text-green-500' : 'text-red-500'} />
            <span className="text-xs text-slate-600">
              {teacher.lastLocation.isInsideGeofence ? 'In campus' : 'Off campus'}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400">No data</span>
        )}
      </td>
      <td className="px-4 py-3">
        {teacher.currentCycle.record?.faceVerified ? (
          <span className="text-xs text-green-600 font-medium">Verified</span>
        ) : (
          <span className="text-xs text-slate-400">Not yet</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="text-sm font-medium text-slate-700">{teacher.attendanceRate}</span>
      </td>
      <td className="px-4 py-3">
        {teacher.currentCycle.record?.checkInTime ? (
          <span className="text-xs text-slate-600">
            {new Date(teacher.currentCycle.record.checkInTime).toLocaleTimeString()}
          </span>
        ) : (
          <span className="text-xs text-slate-400">--</span>
        )}
      </td>
    </tr>
  );
}
