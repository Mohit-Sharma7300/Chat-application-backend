import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/config/guard/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

import { Controller, Body, Patch, Request, UseGuards, Get, UseInterceptors, UploadedFile, Param } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('users')
export class UsersController {

  constructor(private readonly usersService: UsersService) { }

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async profile(@Request() req) {
    return this.usersService.findOne(req.user._id.toString());
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('avatar', {
    storage: diskStorage({
      destination: './uploads/avatars',
      filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
      },
    }),
  }))
  update(
    @Request() req,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (file) {
      updateUserDto.avatar = `/uploads/avatars/${file.filename}`;
    }
    return this.usersService.update(req.user._id.toString(), updateUserDto);
  }

  @Patch('profile/delete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async softDelete(@Request() req) {
    return this.usersService.softDelete(req.user._id.toString());
  }

@Patch(':userId/delete-from-my-contacts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
async deleteContactForUser(@Request() req, @Param('userId') userId: string) {
  const currentUserId = req.user._id.toString();
  return this.usersService.softDeleteContactForUser(currentUserId, userId);
}
}
