import express from 'express';
import { createServer } from 'http';
import WebSocket, { Server as WebSocketServer } from 'ws';
import { randomBytes } from 'crypto';
import { Message, RoomData, ExtWebSocket} from './types';

const app = express();
const httpServer = createServer(app);


const wss = new WebSocketServer({ server: httpServer });


const rooms = new Map<string, RoomData>();


app.get('/', (_, res) => {
  res.send('Server is running.');
});

app.get('/health', (_, res) => {
  res.status(200).send('OK');
});


wss.on('connection', (ws: ExtWebSocket) => {
  ws.id = randomBytes(4).toString('hex');
  console.log(`🟢 Client connected: ${ws.id}`);

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'create-room') {
        const roomCode = randomBytes(3).toString('hex').toUpperCase();
        rooms.set(roomCode, {
          users: new Set<string>(),
          messages: [],
          lastActive: Date.now(),
        });

        ws.send(JSON.stringify({ type: 'room-created', roomCode }));
        console.log(`🏠 Room created: ${roomCode}`);
      }

      else if (data.type === 'join-room') {
        const { roomId } = data;
        const room = rooms.get(roomId);

        if (!room) {
          ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
          return;
        }

        room.users.add(ws.id);
        ws.roomId = roomId;
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

        console.log(`👥 [${ws.id}] joined room: ${roomId}`);
      }

      else if (data.type === 'send-message') {
        const { roomCode, message, userId, name } = data;
        const room = rooms.get(roomCode);

        if (!room || !message?.trim()) return;

        room.lastActive = Date.now();
        const msg: Message = {
          id: randomBytes(4).toString('hex'),
          content: message,
          senderId: userId,
          sender: name,
          timestamp: new Date(),
        };

        room.messages.push(msg);

        broadcastToRoom(roomCode, {
          type: 'new-message',
          message: msg,
        });

        console.log(`✉️ [${userId}] to [${roomCode}]: ${message}`);
      }

    } catch (err) {
      console.error('❌ Error processing message:', err);
    }
  });

  ws.on('close', () => {
    if (!ws.roomId) return;

    const room = rooms.get(ws.roomId);
    if (room && room.users.has(ws.id)) {
      room.users.delete(ws.id);

      broadcastToRoom(ws.roomId, {
        type: 'user-left',
        usersCount: room.users.size,
      });

      console.log(`🔴 [${ws.id}] left room: ${ws.roomId}`);

      if (room.users.size === 0) {
        rooms.delete(ws.roomId);
        console.log(`🧹 Room cleaned: ${ws.roomId}`);
      }
    }
  });
});


function broadcastToRoom(roomCode: string, message: any) {
  const room = rooms.get(roomCode);
  if (!room) return;

  wss.clients.forEach((client) => {
    const extClient = client as ExtWebSocket;

    if (
      client.readyState === WebSocket.OPEN &&
      extClient.roomId === roomCode &&
      room.users.has(extClient.id)
    ) {
      client.send(JSON.stringify(message));
    }
  });
}


setInterval(() => {
  const now = Date.now();
  rooms.forEach((room, roomCode) => {
    if (room.users.size === 0 && now - room.lastActive > 3600000) {
      rooms.delete(roomCode);
      console.log(`🧼 Auto-cleaned inactive room: ${roomCode}`);
    }
  });
}, 3600000);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});