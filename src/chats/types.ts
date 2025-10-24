import { Socket } from 'socket.io';

export interface AuthenticatedSocket extends Socket {
    data: {
        user?: {
            sub: string;
            email?: string;
            name?: string;
            [key: string]: any;
        };
    };
}
