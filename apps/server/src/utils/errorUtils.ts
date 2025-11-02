export function sendError(ws: WebSocket, message: string, code: number = 400) {
  ws.send(JSON.stringify({ type: 'error', message, code }));
}
