import React from 'react';
import { MapPin, Navigation, AlertTriangle, CheckCircle, Shield } from 'lucide-react';

export default function GeofenceStatus({ geofenceStatus, school }) {
  if (!geofenceStatus) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 text-slate-400">
          <MapPin size={20} />
          <span className="text-sm">Fetching location...</span>
        </div>
      </div>
    );
  }

  const { isInside, distance, status, label, color } = geofenceStatus;

  const colorClasses = {
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'text-green-600',
      text: 'text-green-800',
      badge: 'bg-green-100 text-green-700'
    },
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: 'text-yellow-600',
      text: 'text-yellow-800',
      badge: 'bg-yellow-100 text-yellow-700'
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
      text: 'text-red-800',
      badge: 'bg-red-100 text-red-700'
    }
  };

  const colors = colorClasses[color] || colorClasses.green;

  return (
    <div className={`rounded-xl shadow-sm border ${colors.border} ${colors.bg} p-6`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Navigation size={16} className="text-indigo-600" />
          Geofence Status
        </h3>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${colors.badge}`}>
          {label}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-full ${isInside ? 'bg-green-100' : 'bg-red-100'}`}>
          {isInside ? (
            <CheckCircle size={28} className="text-green-600" />
          ) : (
            <AlertTriangle size={28} className="text-red-600" />
          )}
        </div>
        
        <div className="flex-1">
          <p className={`text-lg font-bold ${colors.text}`}>
            {isInside ? 'Inside School Premises' : 'Outside School Premises'}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {distance}m from school center
            {school && ` (radius: ${school.radiusMeters}m)`}
          </p>
        </div>
      </div>

      {/* Distance visualization */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span>School Center</span>
          <span>{school?.radiusMeters}m radius</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isInside ? 'bg-green-500' : 'bg-red-500'
            }`}
            style={{
              width: `${Math.min((distance / (school?.radiusMeters * 2 || 400)) * 100, 100)}%`
            }}
          ></div>
        </div>
        <div className="flex items-center justify-between text-xs mt-1">
          <span className="text-slate-400">0m</span>
          <span className={`font-medium ${isInside ? 'text-green-600' : 'text-red-600'}`}>
            You: {distance}m
          </span>
          <span className="text-slate-400">{(school?.radiusMeters || 200) * 2}m</span>
        </div>
      </div>

      {!isInside && (
        <div className="mt-3 p-3 bg-red-100 rounded-lg flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-600" />
          <p className="text-xs text-red-700">
            Warning: You are {distance - (school?.radiusMeters || 200)}m outside the school boundary. 
            Admin has been notified.
          </p>
        </div>
      )}
    </div>
  );
}
