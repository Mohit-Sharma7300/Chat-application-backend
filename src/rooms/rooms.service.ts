import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Room } from './schemas/room.schemas';
import { CreateRoomDto } from './dto/create-room.dto';
import { Types } from 'mongoose';

@Injectable()
export class RoomsService {

  constructor(
    @InjectModel(Room.name) private roomModel: Model<Room>,
  ) { }

  async create(userId: string, createRoomDto: CreateRoomDto) {

    const members = [...new Set([...createRoomDto.members, userId])];

    const existingRoom = await this.roomModel.findOne({
      type: createRoomDto.type,
      members: { $all: members, $size: members.length },
    });

    if (existingRoom) {
      return existingRoom;
    }

    const createdRoom = new this.roomModel({
      ...createRoomDto,
      members,
    });

    return await createdRoom.save();
  }

  async getByRequest(userId: string) {
    return await this.roomModel.find({ members: userId }).exec();
  }
}
