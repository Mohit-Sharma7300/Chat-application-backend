import * as jwt from 'jsonwebtoken';
import { AuthenticatedSocket } from 'src/chats/types';

export function wsAuthMiddleware(socket: AuthenticatedSocket, next: (err?: Error) => void) {
  try {
    const token =
      socket.handshake.auth?.token || // frontend sends via auth
      socket.handshake.headers?.authorization?.split(' ')[1]; // fallback

    if (!token) {
      return next(new Error('No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Store on socket.data instead of socket.user
    socket.data.user = decoded as any;

    return next();
  } catch (err: any) {
    console.error('WS Auth failed:', err.message);
    return next(new Error('Unauthorized'));
  }
}
