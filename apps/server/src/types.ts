import WebSocket from 'ws';

export interface Message {
  id: string;
  content: string;
  senderId: string;
  sender: string;
  timestamp: Date;
}

export interface RoomData {
  users: Set<string>;
  messages: Message[];
  lastActive: number;
}

export interface ExtWebSocket extends WebSocket {
  id: string;
  roomId: string;
  isAlive: boolean;
}