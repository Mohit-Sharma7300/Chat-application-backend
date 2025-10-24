import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
    @ApiProperty({ required: false })
    about?: string;

    @ApiProperty({ required: false })
    birthday?: Date;

    @ApiProperty({ required: false })
    height?: number;

    @ApiProperty({ required: false })
    weight?: number;

    @ApiProperty({ required: false, type: [Number] })
    interests?: number[];

    @ApiProperty({ required: false })
    avatar?: string;

    @ApiProperty({ required: false })
    name: string;

    @ApiProperty({ required: false })
    username: string;

    @ApiProperty({ required: false })
    email: string;

    @ApiProperty({ required: false })
    password_key: string;

}

