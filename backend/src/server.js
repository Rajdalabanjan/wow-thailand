// ========================================================================
// WOW THAILAND: Express & Socket.IO Server Entry Point
// ========================================================================

import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import fs from 'fs';

import apiRouter from './routes/api.routes.js';
import compatRouter from './routes/compat.routes.js';
import { authenticateToken, verifyAuthToken } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { resolveVendorId, resolveDriverId } from './utils/identityResolver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const server = http.createServer(app);

const PORT = parseInt(process.env.PORT || '5000', 10);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// 1. Security & Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: [CLIENT_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Auth-Token', 'X-Tenant-ID', 'X-User-Role']
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use('/uploads', express.static(uploadsDir));
app.use(authenticateToken);

// 2. Socket.IO Real-Time Engine
export const io = new SocketIOServer(server, {
  cors: {
    origin: [CLIENT_ORIGIN, 'http://localhost:5173'],
    methods: ['GET', 'POST']
  }
});

const SOCKET_ADMIN_ROLES = new Set(['admin', 'superadmin', 'super_admin', 'subadmin', 'sub_admin']);

// Identify the user from the JWT sent in the handshake: io(url, { auth: { token } }).
// Guests may connect, but can only join public ride-tracking rooms.
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  socket.data.user = typeof token === 'string' ? verifyAuthToken(token.trim()) : null;
  next();
});

/**
 * Room access rules:
 *   dispatch_<id>  anyone (same visibility as the public GET /cabs/track/:id)
 *   admin          admin roles only
 *   vendor_<id>    that vendor, or admin
 *   driver_<id>    that driver, or admin
 */
async function canJoinRoom(user, room) {
  if (typeof room !== 'string' || room.length === 0 || room.length > 120) return false;
  if (room.startsWith('dispatch_')) return true;
  if (!user) return false;

  const isAdmin = SOCKET_ADMIN_ROLES.has(user.role);
  if (room === 'admin') return isAdmin;
  if (room.startsWith('vendor_')) {
    return isAdmin || String(await resolveVendorId(user)) === room.slice('vendor_'.length);
  }
  if (room.startsWith('driver_')) {
    return isAdmin || (user.role === 'driver' && String(await resolveDriverId(user)) === room.slice('driver_'.length));
  }
  return false;
}

io.on('connection', (socket) => {
  socket.on('join_room', async (room, ack) => {
    let allowed = false;
    try {
      allowed = await canJoinRoom(socket.data.user, room);
      if (allowed) socket.join(room);
    } catch (err) {
      console.warn('[Socket] join_room check failed:', err.message);
    }
    if (typeof ack === 'function') ack({ ok: allowed });
  });
});

// Helper to broadcast events
export function broadcastEvent(room, event, data) {
  if (room) {
    io.to(room).emit(event, data);
  } else {
    io.emit(event, data);
  }
}

// 3. Mount Routes
app.use('/api/v1', apiRouter);
app.use('/api', apiRouter);
app.use('/', compatRouter); // Handles /api.php queries from existing frontend

// 4. Error Handling
app.use(errorHandler);

process.on('uncaughtException', (err) => {
  console.error('🔥 [UNCAUGHT EXCEPTION]:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 [UNHANDLED REJECTION]:', reason);
});

// 5. Start Server
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`🌴 WOW THAILAND Server running on http://localhost:${PORT}`);
    console.log(`🚀 REST API: http://localhost:${PORT}/api/v1/health`);
    console.log(`🔄 Compatibility Router: http://localhost:${PORT}/api.php`);
  });
}

export { app, server };
