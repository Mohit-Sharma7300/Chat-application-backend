import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { MongooseModule } from '@nestjs/mongoose';

import { Chat, ChatSchema } from 'src/chats/schemas/chat.schemas';
import { Room, RoomSchema } from 'src/rooms/schemas/room.schemas';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Chat.name, schema: ChatSchema }, { name: Room.name, schema: RoomSchema }]),
    AuthModule,
  ],
  controllers: [UploadsController],
})
export class UploadsModule { }
