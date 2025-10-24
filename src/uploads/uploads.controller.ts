import { Controller, Post, UseInterceptors, UploadedFiles, BadRequestException, UseGuards, Req, } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from 'src/config/guard/jwt-auth.guard';
import { Request } from 'express';
import { Get, Param, Res, Query, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { Chat, ChatDocument } from 'src/chats/schemas/chat.schemas';
import { Room, RoomDocument } from 'src/rooms/schemas/room.schemas';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs';

const UPLOAD_DIR = './uploads';
const MAX_FILES = 100;
const MAX_SIZE = 50 * 1024 * 1024;

const storage = diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + extname(file.originalname));
  },
});

function fileFilter(req, file, cb) {
  const allowed = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',

    'video/mp4',
    'video/webm',
    'video/quicktime',

    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ];

  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new BadRequestException('Invalid file type'), false);
}

@Controller('uploads')
export class UploadsController {

  constructor(
    @InjectModel(Chat.name) private chatModel: Model<ChatDocument>,
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
  ) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES, {
      storage,
      fileFilter,
      limits: { fileSize: MAX_SIZE },
    }),
  )
  async uploadFiles(@Req() req: Request, @UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const result = files.map((f) => {
      let type: 'image' | 'video' | 'document' = 'document';
      if (f.mimetype.startsWith('image')) type = 'image';
      else if (f.mimetype.startsWith('video')) type = 'video';

      return {
        url: `${baseUrl}/uploads/${f.filename}`,
        mime: f.mimetype,
        type,
        filename: f.originalname,
        size: f.size,
      };
    });
    return result;
  }


  @Get('download/:file')
  @UseGuards(JwtAuthGuard)
  async downloadFile(
    @Param('file') file: string,
    @Query('name') name: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const chat = await this.chatModel.findOne({ 'media.url': new RegExp(`${file}$`) }).lean();
    if (!chat) throw new BadRequestException('File not found');

    const room = await this.roomModel.findById(chat.room_id).lean();
    if (!room) throw new BadRequestException('Invalid room');
  
    const userId = req.user?._id;
    console.log(userId)
    if (!userId) throw new UnauthorizedException();

    const isMember = room.members.some((m: any) => m.toString() === userId.toString());

    if (!isMember) throw new UnauthorizedException('You are not allowed to download this file');

    const mediaObj = (chat.media || []).find((m: any) => m.url && m.url.endsWith(file));

    const originalName = name || mediaObj?.filename || file;

    const pathToFile = join(process.cwd(), 'uploads', file);

    if (!fs.existsSync(pathToFile)) throw new BadRequestException('File not found');

    return res.download(pathToFile, originalName);

  }

}
