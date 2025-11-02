import { sendError } from './errorUtils';
import { ExtWebSocket } from '../types';

const MESSAGE_WINDOW_MS = 1000; 
const MAX_MESSAGES_PER_WINDOW = 20; 

export function initializeRateLimiter(ws: ExtWebSocket) {
  ws.rateLimiter = {
    messageCount: 0,
    lastResetTime: Date.now(),
  };
}

export function checkRateLimit(ws: ExtWebSocket): boolean {
  if (!ws.rateLimiter) {
    initializeRateLimiter(ws);
  }

  const rateLimiter = ws.rateLimiter!;
  const now = Date.now();
  if (now - rateLimiter.lastResetTime > MESSAGE_WINDOW_MS) {
  
    rateLimiter.messageCount = 1;
    rateLimiter.lastResetTime = now;
    return true;
  } else {
    rateLimiter.messageCount++;
    if (rateLimiter.messageCount > MAX_MESSAGES_PER_WINDOW) {
      sendError(ws, 'Too many requests. Please slow down.', 429);
      return false;
    }
    return true;
  }
}
