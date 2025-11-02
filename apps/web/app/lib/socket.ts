let socket: WebSocket | null = null;

export function getSocket(): WebSocket {
  if (!socket || socket.readyState === WebSocket.CLOSED) {
    const url = process.env.NEXT_PUBLIC_WS_URL;
    socket = new WebSocket(url || "ws://localhost:4000");
  }
  return socket;
}