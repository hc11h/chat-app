import WebSocket from 'ws';

export interface Message {
  id: string;
  content: string;
  senderId: string;
  sender: string;
  timestamp: Date;
  status?: 'sent' | 'seen';
}

export interface RoomData {
  users: Set<string>;
  messages: Message[];
  lastActive: number;
}

export interface ExtWebSocket extends WebSocket {
  isAlive: boolean;
  id: string;
  roomId: string;
  rateLimiter?: {
    messageCount: number;
    lastResetTime: number;
  };
}