import { randomBytes } from 'crypto';
import { Message, ExtWebSocket, RoomData } from '../types';
import { sendError } from '../utils/errorUtils';
import { getRoom, getRoomsMap } from './roomManager';

export function handleSendMessage(ws: ExtWebSocket, data: any, broadcastToRoom: (roomCode: string, message: any, skipUserId?: string) => void) {
  const { roomCode, message, userId, name } = data;
  if (!roomCode || !message?.trim() || !userId || !name) {
    sendError(ws, 'send-message missing roomCode, message, userId, or name');
    return;
  }
  if (typeof roomCode !== 'string' || roomCode.trim().length === 0) {
    sendError(ws, 'Invalid roomCode');
    return;
  }
  if (typeof message !== 'string' || message.trim().length === 0) {
    sendError(ws, 'Message cannot be empty');
    return;
  }
  if (typeof userId !== 'string' || userId.trim().length === 0) {
    sendError(ws, 'Invalid userId');
    return;
  }
  if (typeof name !== 'string' || name.trim().length === 0) {
    sendError(ws, 'Invalid name');
    return;
  }
  const room = getRoom(roomCode);
  if (!room) {
    sendError(ws, 'Room not found', 404);
    return;
  }

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

export function handleTyping(ws: ExtWebSocket, data: any, broadcastToRoom: (roomCode: string, message: any, skipUserId?: string) => void) {
  const { roomCode, userId, name } = data;
  if (!roomCode || !userId) return;
  broadcastToRoom(roomCode, {
    type: 'typing',
    userId,
    name,
  }, userId);
}

export function handleSeenMessage(ws: ExtWebSocket, data: any, broadcastToRoom: (roomCode: string, message: any, skipUserId?: string) => void) {
  const { roomCode, messageId, userId } = data;
  const room = getRoom(roomCode);
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
