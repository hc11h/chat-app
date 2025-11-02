import express from 'express';
import cron from 'node-cron'
import { createServer } from 'http';
import WebSocket, { Server as WebSocketServer } from 'ws';
import { ExtWebSocket } from './types';
import { createRoom, joinRoom, leaveRoom, getRoomsMap } from './services/roomManager';
import { handleSendMessage, handleTyping, handleSeenMessage } from './services/messageHandler';
import { initializeRateLimiter, checkRateLimit } from './utils/rateLimiter';

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({
  server: httpServer,
  verifyClient: (info, done) => {

    const origin = info.origin;
    const allowedOrigins = [
      'https://chat-app-web-eta.vercel.app',
      'http://localhost:3000'
    ];

    if (allowedOrigins.includes(origin)) {
      console.log(`WebSocket connection accepted from origin: ${origin}`);
      done(true); 
    } else {
      console.log(`WebSocket connection rejected from origin: ${origin}`);
      done(false, 403, 'Forbidden');
    }
  }
});


app.get('/', (_, res) => res.status(200).send('OK'));

wss.on('connection', (ws: ExtWebSocket) => {
  ws.isAlive = true;
  ws.id = '';      
  ws.roomId = '';
  initializeRateLimiter(ws);

  console.log('Client connected');

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (raw: string) => {
    if (!checkRateLimit(ws)) {
      return;
    }

    let data: any;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error('Invalid JSON from client:', raw);
      return;
    }

    if (data.type === 'join-room') {
      const { roomId, userId } = data;
      joinRoom(ws, roomId, userId, broadcastToRoom);
    }
    else if (data.type === 'create-room') {
      createRoom(ws);
    }
    else if (data.type === 'send-message') {
      handleSendMessage(ws, data, broadcastToRoom);
    }
   
    else if (data.type === 'typing') {
      handleTyping(ws, data, broadcastToRoom);
    }

    else if (data.type === 'seen-message') {
      handleSeenMessage(ws, data, broadcastToRoom);
    }
  });

  ws.on('close', () => {
    leaveRoom(ws, broadcastToRoom);
  });
});


function broadcastToRoom(roomCode: string, message: any, skipUserId?: string) {
  const rooms = getRoomsMap();
  const room = rooms.get(roomCode);
  if (!room) return;

  wss.clients.forEach((client) => {
    const c = client as ExtWebSocket;
    if (
      client.readyState === WebSocket.OPEN &&
      c.roomId === roomCode &&
      room.users.has(c.id) &&
      (!skipUserId || c.id !== skipUserId)
    ) {
      client.send(JSON.stringify(message));
    }
  });
}

cron.schedule('*/5 * * * *', async () => {
  try {
    await fetch(`http://localhost:${process.env.PORT || 4000}/`);
    console.log('Keep-alive ping sent');
  } catch (err) {
    console.error('Keep-alive ping failed:', err);
  }
});


cron.schedule('0 0 * * *', () => {
  const rooms = getRoomsMap();
  rooms.clear();
  console.log('🧹 All chats cleared (24h cron)');
});


const HEARTBEAT_INTERVAL = 30000;
setInterval(() => {
  wss.clients.forEach((client) => {
    const ws = client as ExtWebSocket;
    if (!ws.isAlive) {
      console.log(`Terminating stale connection: userId=${ws.id}`);
      return ws.terminate();
    }
    console.log(`Pinging client userId=${ws.id || '(no-id yet)'}`);
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL);



const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});