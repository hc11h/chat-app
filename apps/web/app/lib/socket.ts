let socket: WebSocket | null = null;

export function getSocket(): WebSocket {
  if (!socket || socket.readyState === WebSocket.CLOSED) {
    socket = new WebSocket("ws://localhost:4000"); 
  }
  return socket;
}