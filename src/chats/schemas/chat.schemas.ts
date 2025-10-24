import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Room } from 'src/rooms/schemas/room.schemas';
import { User } from 'src/users/schemas/user.schemas';

export type ChatDocument = HydratedDocument<Chat>;

@Schema({ timestamps: true, versionKey: false })
export class Chat {
  
  @Prop({ required: false, default: '' })
  content?: string;

  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: User.name, autopopulate: true })
  sender_id: User;

  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: Room.name })
  room_id: Room;

  @Prop({ type: [String], default: [] })
  readBy: string[];

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;

  
  @Prop({ type: [Object], default: [] })
  media?: Array<{
    url: string;
    mime?: string;
    type?: 'image' | 'video' | 'document';
    filename?: string;
    size?: number;
    thumbnailUrl?: string;
  }>;
}

export const ChatSchema = SchemaFactory.createForClass(Chat);
