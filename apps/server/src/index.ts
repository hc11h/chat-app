import express from 'express';
import { createServer } from 'http';
import WebSocket, { Server as WebSocketServer } from 'ws';
import { randomBytes } from 'crypto';
import { Message, RoomData, ExtWebSocket } from './types';

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({
  server: httpServer,
  verifyClient: (info, done) => {

    const origin = info.origin;


    const allowedOrigins = [
      'https://chat-app-web-eta.vercel.app', 
    ];

    if (allowedOrigins.includes(origin)) {
      console.log(`✅ WebSocket connection accepted from origin: ${origin}`);
      done(true); 
    } else {
      console.log(`❌ WebSocket connection rejected from origin: ${origin}`);
      done(false, 403, 'Forbidden');
    }
  }
});

const rooms = new Map<string, RoomData>();

app.get('/health', (_, res) => res.status(200).send('OK'));

wss.on('connection', (ws: ExtWebSocket) => {
  ws.isAlive = true;
  ws.id = '';      
  ws.roomId = '';

  console.log('🟢 Client connected');

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (raw: string) => {
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error('Invalid JSON from client:', raw);
      return;
    }

    if (data.type === 'join-room') {
      const { roomId, userId } = data;
      if (!roomId || !userId) {
        ws.send(JSON.stringify({ type: 'error', message: 'join-room missing roomId or userId' }));
        return;
      }
      const room = rooms.get(roomId);
      if (!room) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
        return;
      }

      ws.id = userId;
      ws.roomId = roomId;
      room.users.add(userId);
      room.lastActive = Date.now();

      ws.send(JSON.stringify({
        type: 'joined-room',
        roomCode: roomId,
        messages: room.messages,
      }));

      broadcastToRoom(roomId, {
        type: 'user-joined',
        usersCount: room.users.size,
      });

      console.log(`👥 User joined: userId=${ws.id}, room=${roomId}, usersCount=${room.users.size}`);
    }
    else if (data.type === 'create-room') {
      const roomCode = randomBytes(3).toString('hex').toUpperCase();
      rooms.set(roomCode, {
        users: new Set<string>(),
        messages: [],
        lastActive: Date.now(),
      });

      ws.send(JSON.stringify({ type: 'room-created', roomCode }));
      console.log(`🏠 Room created: ${roomCode}`);
    }
    else if (data.type === 'send-message') {
      const { roomCode, message, userId, name } = data;
      const room = rooms.get(roomCode);
      if (!room || !message?.trim()) return;

      room.lastActive = Date.now();
      const msg: Message & { status?: string } = {
        id: randomBytes(4).toString('hex'),
        content: message,
        senderId: userId,
        sender: name,
        timestamp: new Date(),
        status: 'sent',
      };

      room.messages.push(msg);
      broadcastToRoom(roomCode, {
        type: 'new-message',
        message: msg,
      });

      console.log(`✉️ [${userId}] → room ${roomCode}: ${message}`);
    }
   
    else if (data.type === 'typing') {
      const { roomCode, userId, name } = data;
      if (!roomCode || !userId) return;
      broadcastToRoom(roomCode, {
        type: 'typing',
        userId,
        name,
      }, userId); 
    }

    else if (data.type === 'seen-message') {
      const { roomCode, messageId, userId } = data;
      const room = rooms.get(roomCode);
      if (!room) return;
 
      const msg = room.messages.find((m) => m.id === messageId);
      if (msg && msg.status !== 'seen') {
        msg.status = 'seen';
        broadcastToRoom(roomCode, {
          type: 'message-seen',
          messageId,
          userId,
        });
      }
    }
  });

  ws.on('close', () => {
    if (!ws.roomId || !ws.id) return;

    const room = rooms.get(ws.roomId);
    if (room && room.users.has(ws.id)) {
      room.users.delete(ws.id);

      broadcastToRoom(ws.roomId, {
        type: 'user-left',
        usersCount: room.users.size,
      });

      console.log(`🔴 User left: userId=${ws.id}, room=${ws.roomId}, usersCount=${room.users.size}`);

      if (room.users.size === 0) {
        rooms.delete(ws.roomId);
        console.log(`🧹 Room removed: ${ws.roomId}`);
      }
    }
  });
});


function broadcastToRoom(roomCode: string, message: any, skipUserId?: string) {
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

const HEARTBEAT_INTERVAL = 30000;
setInterval(() => {
  wss.clients.forEach((client) => {
    const ws = client as ExtWebSocket;
    if (!ws.isAlive) {
      console.log(`💀 Terminating stale connection: userId=${ws.id}`);
      return ws.terminate();
    }
    console.log(`💓 Pinging client userId=${ws.id || '(no-id yet)'}`);
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL);



const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server listening on ${PORT}`);
});