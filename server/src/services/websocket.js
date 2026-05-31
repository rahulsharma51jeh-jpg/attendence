let wss = null;
const clients = new Map(); // Map of userId -> ws connections

export function setupWebSocket(webSocketServer) {
  wss = webSocketServer;

  wss.on('connection', (ws, req) => {
    console.log('📡 New WebSocket connection');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        
        if (data.type === 'register') {
          // Register client with their user ID
          clients.set(data.userId, ws);
          ws.userId = data.userId;
          console.log(`✅ Client registered: ${data.userId}`);
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });

    ws.on('close', () => {
      if (ws.userId) {
        clients.delete(ws.userId);
        console.log(`❌ Client disconnected: ${ws.userId}`);
      }
    });

    // Send welcome message
    ws.send(JSON.stringify({ type: 'connected', message: 'Connected to attendance system' }));
  });
}

/**
 * Broadcast attendance update to all connected clients
 */
export function broadcastAttendanceUpdate(data) {
  if (!wss) return;

  const message = JSON.stringify({
    type: 'attendance_update',
    data,
    timestamp: new Date().toISOString()
  });

  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  });
}

/**
 * Broadcast geofence alert to all connected clients
 */
export function broadcastGeofenceAlert(data) {
  if (!wss) return;

  const message = JSON.stringify({
    type: 'geofence_alert',
    data,
    timestamp: new Date().toISOString()
  });

  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

/**
 * Send notification to specific user
 */
export function sendToUser(userId, data) {
  const ws = clients.get(userId);
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(data));
  }
}

/**
 * Broadcast notification reminder to all teachers
 */
export function broadcastNotification(data) {
  if (!wss) return;

  const message = JSON.stringify({
    type: 'notification',
    data,
    timestamp: new Date().toISOString()
  });

  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}
