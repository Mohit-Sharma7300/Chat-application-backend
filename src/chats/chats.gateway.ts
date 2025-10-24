import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { ChatsService } from './chats.service';
import { RoomsService } from 'src/rooms/rooms.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { Server } from 'socket.io';
import { wsAuthMiddleware } from 'src/config/middleware/ws-auth.middleware';
import { AuthenticatedSocket } from './types';
import { Inject, forwardRef } from '@nestjs/common';

@WebSocketGateway({
  namespace: '/chats',
  cors: {
    origin: [
      'http://localhost:3000',
      'https://chat-frontend-6gc3.vercel.app'
    ],
    credentials: true
  },
})
export class ChatsGateway {
  constructor(
    private readonly chatsService: ChatsService,
    @Inject(forwardRef(() => RoomsService))
    private readonly roomsService: RoomsService,
  ) { }

  @WebSocketServer()
  private server: Server;

  afterInit(server: Server) {
    server.use((socket, next) => wsAuthMiddleware(socket, next));
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() roomId: string,
  ) {
    client.join(roomId);
    client.emit('joined_room', { roomId });
  }

  @SubscribeMessage('create')
  async create(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() createChatDto: CreateChatDto,
  ) {
    if (!client.data.user) return;

    const senderId = client.data.user.sub;
    const chat = await this.chatsService.create(senderId, createChatDto);
    this.server
      .to(createChatDto.room_id)
      .emit('new-chat', { ...chat, tempId: createChatDto.tempId });

    const allSockets = (await this.server.fetchSockets()) as unknown as AuthenticatedSocket[];
    for (const socket of allSockets) {
      const user = socket.data.user;
      if (user && user.sub !== senderId) {
        const counts = await this.chatsService.getUnreadCount(user.sub);
        socket.emit('update-unread', counts);
      }
    }
  }
  async handleConnection(client: AuthenticatedSocket) {
    try {
      const userId = client.data.user?.sub;
      if (!userId) return;

      const rooms = await this.roomsService.getByRequest(userId);
      for (const r of rooms) {
        client.join(r._id.toString());
      }

      client.emit(
        'joined_rooms',
        rooms.map((r) => r._id),
      );
    } catch (err) {
      console.error('handleConnection error', err);
    }
  }


  @SubscribeMessage('read_messages')
  async handleReadMessages(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() roomId: string,
  ) {
    if (!client.data.user) return;

    await this.chatsService.markMessagesRead(roomId, client.data.user.sub);
    const allSocketsRaw = await this.server.fetchSockets();
    const allSockets = allSocketsRaw as unknown as AuthenticatedSocket[];

    for (const socket of allSockets) {
      const user = socket.data.user;
      if (user) {
        const counts = await this.chatsService.getUnreadCount(user.sub);
        socket.emit('update-unread', counts);
      }
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { room_id: string },
  ) {
    if (!client.data.user) return;

    // Broadcast typing to everyone EXCEPT the sender
    client.to(data.room_id).emit('typing', {
      room_id: data.room_id,
      user: {
        _id: client.data.user._id,
        name: client.data.user.name,
      },
    });
  }


  @SubscribeMessage('call:init')
  async handleCallInit(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; toUserId: string }
  ) {
    const targetSocket = [...(await this.server.fetchSockets())].find(
      s => s.data.user?.sub?.toString() === data.toUserId
    );

    if (targetSocket) {
      targetSocket.emit('call:incoming', {
        fromUser: client.data.user,
        roomId: data.roomId,
      });
    }
  }

  @SubscribeMessage('call:offer')
  async handleOffer(@ConnectedSocket() client, @MessageBody() data) {
    const targetSocket = [...(await this.server.fetchSockets())].find(
      s => s.data.user?.sub?.toString() === data.toUserId
    );
    targetSocket?.emit('call:offer', { offer: data.offer, fromUser: client.data.user });
  }

  // --- call:answer ---
  @SubscribeMessage('call:answer')
  async handleAnswer(@ConnectedSocket() client, @MessageBody() data) {
    const target = [...(await this.server.fetchSockets())].find(s => s.data.user?.sub.toString() === data.toUserId);
    target?.emit('call:answer', { answer: data.answer });
  }

  // --- call:ice ---
  @SubscribeMessage('call:ice')
  async handleIce(@ConnectedSocket() client, @MessageBody() data) {
    const target = [...(await this.server.fetchSockets())].find(s => s.data.user?.sub.toString() === data.toUserId);
    target?.emit('call:ice', { candidate: data.candidate });
  }

  // --- call:hangup ---
  @SubscribeMessage('call:hangup')
  async handleHangup(@ConnectedSocket() client, @MessageBody() data: { toUserId: string }) {
    const target = [...(await this.server.fetchSockets())].find(s => s.data.user?.sub.toString() === data.toUserId);
    target?.emit('call:hangup');
  }
}