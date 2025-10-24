import {
  Body,
  Controller,
  Get,
  Delete,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/config/guard/jwt-auth.guard';
import { GetChatDto } from 'src/chats/dto/get-chat.dto';
import { ChatsService } from 'src/chats/chats.service';
import { Inject, forwardRef } from '@nestjs/common';

@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    @Inject(forwardRef(() => ChatsService))
    private readonly chatsService: ChatsService,
  ) { }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getByRequest(@Request() req) {
    const userId = req.user._id.toString();

    const rooms = await this.roomsService.getByRequest(userId);
    const unreadCounts = await this.chatsService.getUnreadCount(userId);

    const augmented = await Promise.all(
      rooms.map(async (room) => {
        const latest = await this.chatsService.findLatest(room._id.toString());
        const unread = (unreadCounts || []).find(
          (c) => c._id?.toString() === room._id.toString(),
        );
        return {
          ...room.toObject ? room.toObject() : room,
          lastMessage: latest?.content || '',
          lastMessageTime: latest?.createdAt || '',
          unreadCount: unread ? unread.count : 0,
        };
      }),
    );

    return augmented;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  create(@Request() req, @Body() createRoomDto: CreateRoomDto) {
    return this.roomsService.create(req.user._id.toString(), createRoomDto);
  }

  @Get(':id/chats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', required: true })
  getChats(@Param('id') id, @Query() dto: GetChatDto) {
    return this.chatsService.findAll(id, new GetChatDto(dto));
  }

  @Delete(':id/chats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', required: true })
  async clearChats(@Param('id') roomId: string, @Request() req) {
    const room = await this.roomsService.getByRequest(req.user._id.toString());
    const roomExists = room.some(r => r._id.toString() === roomId);
    if (!roomExists) {
      return { status: 'error', message: 'Room not found or access denied' };
    }

    await this.chatsService.clearRoomMessages(roomId);
    return { status: 'success', message: 'Chat cleared successfully' };
  }
}
