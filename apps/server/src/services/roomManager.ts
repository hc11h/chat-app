import { randomBytes } from 'crypto';
import { RoomData, ExtWebSocket } from '../types';
import { sendError } from '../utils/errorUtils';


const rooms = new Map<string, RoomData>();

export function createRoom(ws: ExtWebSocket) {
  const roomCode = randomBytes(3).toString('hex').toUpperCase();
  rooms.set(roomCode, {
    users: new Set<string>(),
    messages: [],
    lastActive: Date.now(),
  });

  ws.send(JSON.stringify({ type: 'room-created', roomCode }));
  console.log(`Room created: ${roomCode}`);
  return roomCode;
}

export function joinRoom(ws: ExtWebSocket, roomId: string, userId: string, broadcastToRoom: (roomCode: string, message: any, skipUserId?: string) => void) {
  if (typeof roomId !== 'string' || roomId.trim().length === 0) {
    sendError(ws, 'Invalid roomId');
    return false;
  }
  if (typeof userId !== 'string' || userId.trim().length === 0) {
    sendError(ws, 'Invalid userId');
    return false;
  }

  const room = rooms.get(roomId);
  if (!room) {
    sendError(ws, 'Room not found', 404);
    return false;
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

  console.log(`User joined: userId=${ws.id}, room=${roomId}, usersCount=${room.users.size}`);
  return true;
}

export function leaveRoom(ws: ExtWebSocket, broadcastToRoom: (roomCode: string, message: any, skipUserId?: string) => void) {
  if (!ws.roomId || !ws.id) return;

  const room = rooms.get(ws.roomId);
  if (room && room.users.has(ws.id)) {
    room.users.delete(ws.id);

    broadcastToRoom(ws.roomId, {
      type: 'user-left',
      usersCount: room.users.size,
    });

    console.log(`User left: userId=${ws.id}, room=${ws.roomId}, usersCount=${room.users.size}`);

    if (room.users.size === 0) {
      rooms.delete(ws.roomId);
      console.log(`🧹 Room removed: ${ws.roomId}`);
    }
  }
}

export function getRoom(roomCode: string) {
  return rooms.get(roomCode);
}

export function getRoomsMap() {
  return rooms;
}
