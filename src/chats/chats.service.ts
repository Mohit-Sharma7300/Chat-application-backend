import { Injectable } from '@nestjs/common';
import { CreateChatDto } from './dto/create-chat.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Chat, ChatDocument } from './schemas/chat.schemas';
import { Model, Types } from 'mongoose';
import { GetChatDto } from './dto/get-chat.dto';
import mongoose from 'mongoose';

@Injectable()
export class ChatsService {
  constructor(
    @InjectModel(Chat.name) private chatModel: Model<ChatDocument>,
  ) { }

  // Create a new chat and populate sender
  async create(senderId: string, createChatDto: CreateChatDto) {
    const createdChat = new this.chatModel({
      ...createChatDto,
      sender_id: senderId,
      readBy: [senderId],
    });

    const saved = await createdChat.save();

    // Populate sender before returning
    return this.chatModel
      .findById(saved._id)
      .populate('sender_id', '_id name email')
      .lean()
      .exec();
  }

  // Get latest message for a room
  async findLatest(roomId: string) {
    const latest = await this.chatModel
      .findOne({ room_id: new mongoose.Types.ObjectId(roomId) })
      .populate('sender_id', '_id name email')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return latest || null;
  }


  async getUnreadCount(userId: string) {
    const counts = await this.chatModel.aggregate([
      { $match: { readBy: { $ne: userId } } },
      { $group: { _id: '$room_id', count: { $sum: 1 } } },
    ]);
    return counts;
  }

  async markMessagesRead(roomId: string, userId: string) {
    await this.chatModel.updateMany(
      { room_id: roomId, readBy: { $ne: userId } },
      { $push: { readBy: userId } }
    );
  }

  // Get all messages for a room
  async findAll(roomId: string, getChatDto: GetChatDto) {
    const query: any = { room_id: new mongoose.Types.ObjectId(roomId) };
    if (getChatDto.last_id) {
      query['_id'] = { $lt: getChatDto.last_id };
    }

    return this.chatModel
      .find(query)
      .populate('sender_id', '_id name email') // always populate sender
      .sort({ createdAt: -1 })
      .limit(getChatDto.limit)
      .lean();
  }

  async clearRoomMessages(roomId: string) {
    const roomObjectId = new Types.ObjectId(roomId);
    return await this.chatModel.deleteMany({ room_id: roomObjectId });
  }
}
