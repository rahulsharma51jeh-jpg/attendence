import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import wsService from '../services/websocket.js';
import FaceAuth from '../components/auth/FaceAuth.jsx';
import GeofenceStatus from '../components/geofence/GeofenceStatus.jsx';
import {
  LogOut, Camera, MapPin, Bell, CheckCircle, Clock,
  AlertCircle, Shield, Wifi
} from 'lucide-react';

export default function TeacherPanel() {
  const { user, logout, updateUser } = useAuth();
  const [myStatus, setMyStatus] = useState(null);
  const [geofenceStatus, setGeofenceStatus] = useState(null);
  const [location, setLocation] = useState(null);
  const [showFaceAuth, setShowFaceAuth] = useState(false);
  const [showFaceRegister, setShowFaceRegister] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [checkInResult, setCheckInResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const status = await api.getMyStatus();
      setMyStatus(status);
    } catch (err) {
      console.error('Status fetch error:', err);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Notifications fetch error:', err);
    }
  }, []);

  // Get current location
  const getCurrentLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setLocation(loc);
          resolve(loc);
        },
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  // Verify geofence on location get
  const verifyLocation = useCallback(async () => {
    try {
      const loc = await getCurrentLocation();
      const result = await api.verifyGeofence(loc.latitude, loc.longitude);
      setGeofenceStatus(result);
      return result;
    } catch (err) {
      console.error('Location error:', err);
      setError('Unable to get location. Please enable GPS.');
    }
  }, [getCurrentLocation]);

  useEffect(() => {
    fetchStatus();
    fetchNotifications();
    verifyLocation();

    // Auto-verify location every 5 minutes
    const locationInterval = setInterval(verifyLocation, 300000);
    
    // Listen for notifications
    const unsubNotification = wsService.subscribe('notification', (msg) => {
      fetchNotifications();
    });

    return () => {
      clearInterval(locationInterval);
      unsubNotification();
    };
  }, [fetchStatus, fetchNotifications, verifyLocation]);

  // Handle face authentication success for check-in
  const handleFaceVerified = async (faceDescriptor) => {
    setLoading(true);
    setError('');
    setShowFaceAuth(false);

    try {
      const loc = location || await getCurrentLocation();
      
      const result = await api.checkIn({
        faceDescriptor,
        latitude: loc.latitude,
        longitude: loc.longitude
      });

      setCheckInResult(result);
      fetchStatus();
      verifyLocation();
    } catch (err) {
      setError(err.message || 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle face registration
  const handleFaceRegistered = async (faceDescriptor) => {
    try {
      await api.registerFace(faceDescriptor);
      updateUser({ hasFaceData: true });
      setShowFaceRegister(false);
      alert('Face registered successfully! You can now use face authentication for attendance.');
    } catch (err) {
      setError(err.message || 'Face registration failed');
    }
  };

  const handleCheckOut = async () => {
    try {
      await api.checkOut();
      fetchStatus();
      setCheckInResult(null);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-indigo-600" />
            <div>
              <h1 className="text-lg font-bold text-slate-900">My Attendance</h1>
              <p className="text-xs text-slate-500">{user?.school?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell size={18} className="text-slate-500" />
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              )}
            </div>
            <span className="text-sm text-slate-600">{user?.name}</span>
            <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 transition">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Error display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle size={18} />
            <span className="text-sm">{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">x</button>
          </div>
        )}

        {/* Success message */}
        {checkInResult && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle size={18} />
              <span className="font-medium text-sm">Attendance marked successfully!</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-green-600">Cycle:</span>
                <span className="ml-1 font-medium">{checkInResult.cycleLabel}</span>
              </div>
              <div>
                <span className="text-green-600">Face:</span>
                <span className="ml-1 font-medium">{checkInResult.faceVerified ? 'Verified' : 'Not verified'}</span>
              </div>
              <div>
                <span className="text-green-600">Location:</span>
                <span className="ml-1 font-medium">{checkInResult.geofence?.isInside ? 'Inside' : `Outside (${checkInResult.geofence?.distance}m)`}</span>
              </div>
            </div>
          </div>
        )}

        {/* Current Status Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Clock size={20} className="text-indigo-600" />
              Today's Status
            </h2>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
              Cycle {myStatus?.currentCycle || '-'}: {myStatus?.cycleLabel || ''}
            </span>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-indigo-600">{myStatus?.totalMarked || 0}</p>
              <p className="text-xs text-slate-500">Marked</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-600">{myStatus?.totalCycles || 0}</p>
              <p className="text-xs text-slate-500">Total Cycles</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {myStatus?.totalCycles ? Math.round((myStatus.totalMarked / myStatus.totalCycles) * 100) : 0}%
              </p>
              <p className="text-xs text-slate-500">Rate</p>
            </div>
          </div>

          {/* Cycle History */}
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(cycle => {
              const record = myStatus?.records?.find(r => r.cycle === cycle);
              const isCurrent = cycle === myStatus?.currentCycle;
              return (
                <div
                  key={cycle}
                  className={`flex-1 p-2 rounded-lg text-center border-2 transition ${
                    record ? 'bg-green-50 border-green-300' :
                    isCurrent ? 'bg-indigo-50 border-indigo-300 animate-pulse' :
                    'bg-slate-50 border-slate-200'
                  }`}
                >
                  <p className="text-xs font-medium text-slate-600">C{cycle}</p>
                  {record ? (
                    <CheckCircle size={16} className="mx-auto mt-1 text-green-600" />
                  ) : (
                    <div className="w-4 h-4 mx-auto mt-1 rounded-full bg-slate-200"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Geofence Status */}
        <GeofenceStatus geofenceStatus={geofenceStatus} school={user?.school} />

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Face Registration */}
          {!user?.hasFaceData && (
            <button
              onClick={() => setShowFaceRegister(true)}
              className="flex items-center gap-3 p-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition"
            >
              <Camera size={24} />
              <div className="text-left">
                <p className="font-medium">Register Your Face</p>
                <p className="text-xs text-purple-200">Required for face authentication</p>
              </div>
            </button>
          )}

          {/* Check In */}
          <button
            onClick={() => setShowFaceAuth(true)}
            disabled={loading}
            className="flex items-center gap-3 p-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition disabled:opacity-50"
          >
            <CheckCircle size={24} />
            <div className="text-left">
              <p className="font-medium">
                {loading ? 'Processing...' : 'Mark Attendance'}
              </p>
              <p className="text-xs text-green-200">Face verification + GPS location</p>
            </div>
          </button>

          {/* Check Out */}
          <button
            onClick={handleCheckOut}
            className="flex items-center gap-3 p-4 bg-slate-600 text-white rounded-xl hover:bg-slate-700 transition"
          >
            <LogOut size={24} />
            <div className="text-left">
              <p className="font-medium">Check Out</p>
              <p className="text-xs text-slate-300">End current cycle session</p>
            </div>
          </button>

          {/* Refresh Location */}
          <button
            onClick={verifyLocation}
            className="flex items-center gap-3 p-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
          >
            <MapPin size={24} />
            <div className="text-left">
              <p className="font-medium">Update Location</p>
              <p className="text-xs text-blue-200">Check geofence status</p>
            </div>
          </button>
        </div>

        {/* Notifications */}
        {notifications.filter(n => !n.isRead).length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Bell size={16} className="text-orange-500" />
              Pending Reminders
            </h3>
            <div className="space-y-2">
              {notifications.filter(n => !n.isRead).slice(0, 3).map(n => (
                <div key={n.id} className="p-3 bg-orange-50 rounded-lg flex items-start gap-2">
                  <AlertCircle size={16} className="text-orange-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-700">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-1">{new Date(n.sentAt).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => api.markNotificationRead(n.id).then(fetchNotifications)}
                    className="text-xs text-indigo-600 hover:text-indigo-800"
                  >
                    Dismiss
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Face Auth Modal */}
      {showFaceAuth && (
        <FaceAuth
          mode="verify"
          onSuccess={handleFaceVerified}
          onClose={() => setShowFaceAuth(false)}
        />
      )}

      {/* Face Registration Modal */}
      {showFaceRegister && (
        <FaceAuth
          mode="register"
          onSuccess={handleFaceRegistered}
          onClose={() => setShowFaceRegister(false)}
        />
      )}
    </div>
  );
}
