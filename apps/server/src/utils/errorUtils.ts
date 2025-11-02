import { ExtWebSocket } from '../types';

export function sendError(ws: ExtWebSocket, message: string, code: number = 400) {
  ws.send(JSON.stringify({ type: 'error', message, code }));
}
