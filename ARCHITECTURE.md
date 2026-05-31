# Live Attendance Panel - System Architecture

## Overview
A production-ready attendance monitoring system for schools that tracks teacher presence using:
- **Face Authentication** - Browser-based face recognition for marking attendance
- **Geofencing** - GPS-based radius detection (inside/outside school premises)
- **2-Hour Notification Cycle** - Automated reminders every 2 hours for attendance verification
- **Real-time Dashboard** - Live monitoring panel for administrators

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + Vite)                       │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────────┐  ┌───────────┐  ┌──────────────┐  │
│  │  Face    │  │  Geolocation │  │  Real-time│  │ Notification │  │
│  │  Auth    │  │  Tracking    │  │  Dashboard│  │   Center     │  │
│  │(face-api)│  │  (GPS API)   │  │  (WebSocket│  │  (Push API)  │  │
│  └──────────┘  └──────────────┘  └───────────┘  └──────────────┘  │
└─────────────────────────────┬───────────────────────────────────────┘
                              │ REST API + WebSocket
┌─────────────────────────────┴───────────────────────────────────────┐
│                    BACKEND (Node.js + Express)                        │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────────┐  ┌───────────┐  ┌──────────────┐  │
│  │  Auth    │  │  Attendance  │  │  Geofence │  │  Scheduler   │  │
│  │  Service │  │  Service     │  │  Service  │  │  (node-cron) │  │
│  └──────────┘  └──────────────┘  └───────────┘  └──────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    WebSocket Server (ws)                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────────────┐
│                    DATABASE (SQLite + Prisma ORM)                     │
├─────────────────────────────────────────────────────────────────────┤
│  Schools | Teachers | Attendance | FaceData | Notifications | Logs   │
└─────────────────────────────────────────────────────────────────────┘
```

## Database Schema

### Schools
- id, name, address, latitude, longitude, radius_meters, created_at

### Teachers  
- id, school_id, name, email, password_hash, face_descriptor (JSON), status, created_at

### AttendanceRecords
- id, teacher_id, school_id, check_in_time, check_out_time, status, location_lat, location_lng, is_inside_geofence, face_verified, date

### Notifications
- id, teacher_id, message, type, is_read, sent_at, scheduled_for

### LocationLogs
- id, teacher_id, latitude, longitude, is_inside_geofence, logged_at

## Key Features
1. **Geofence Detection**: Haversine formula calculates if teacher is within school radius
2. **Face Authentication**: face-api.js for browser-based face detection/recognition
3. **2-Hour Cycles**: node-cron scheduler sends attendance reminders every 2 hours (8AM-6PM)
4. **Live Dashboard**: WebSocket-powered real-time updates for admin monitoring
5. **Status Indicators**: Green (present+inside), Yellow (present+outside), Red (absent)

## API Endpoints
- POST /api/auth/register - Register teacher with face data
- POST /api/auth/login - Login with email/password
- POST /api/attendance/check-in - Mark attendance with face verification + location
- POST /api/attendance/check-out - Mark check-out
- GET /api/attendance/live - Get real-time attendance status (all teachers)
- GET /api/attendance/history - Get attendance history
- POST /api/geofence/verify - Verify if location is within school radius
- GET /api/notifications - Get pending notifications
- PUT /api/notifications/:id/read - Mark notification as read
- GET /api/schools/:id - Get school details with geofence config
- WS /ws - WebSocket for real-time updates

## Tech Stack
- **Frontend**: React 18, Vite, TailwindCSS, face-api.js, Leaflet maps
- **Backend**: Node.js, Express, Prisma ORM, WebSocket (ws), node-cron
- **Database**: SQLite (easily swap to PostgreSQL for production)
- **Auth**: JWT tokens, bcrypt password hashing
