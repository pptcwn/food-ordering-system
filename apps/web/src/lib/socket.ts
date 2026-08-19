import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket && typeof window !== 'undefined') {
    const socketUrl =
      process.env.NEXT_PUBLIC_WS_URL ||
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      `${window.location.protocol}//${window.location.hostname}:4000`;
    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      auth: (cb) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
        cb({ token });
      }
    });
  }
  return socket!;
}
