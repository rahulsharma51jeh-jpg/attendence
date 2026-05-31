import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import attendanceRoutes from './routes/attendance.js';
import geofenceRoutes from './routes/geofence.js';
import notificationRoutes from './routes/notifications.js';
import schoolRoutes from './routes/schools.js';
import { startScheduler } from './services/scheduler.js';
import { setupWebSocket } from './services/websocket.js';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Large limit for face descriptor data

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/geofence', geofenceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/schools', schoolRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Setup WebSocket
setupWebSocket(wss);

// Start 2-hour notification scheduler
startScheduler();

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket available at ws://localhost:${PORT}/ws`);
});

export { wss };
