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
import { authenticateToken } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

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

io.on('connection', (socket) => {
  // Join role room (e.g., 'drivers', 'vendors', 'admin')
  socket.on('join_room', (room) => {
    socket.join(room);
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
app.use('/', compatRouter); // Handles /api.php queries from existing frontend

// 4. Error Handling
app.use(errorHandler);

// 5. Start Server
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`🌴 WOW THAILAND Server running on http://localhost:${PORT}`);
    console.log(`🚀 REST API: http://localhost:${PORT}/api/v1/health`);
    console.log(`🔄 Compatibility Router: http://localhost:${PORT}/api.php`);
  });
}

export { app, server };
