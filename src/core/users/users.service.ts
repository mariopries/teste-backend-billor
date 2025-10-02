import { Injectable } from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { createHash } from 'crypto';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(3)
  password!: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const password_hash = createHash('sha256')
      .update(dto.password)
      .digest('hex');
    return this.prisma.user.create({
      data: { name: dto.name, email: dto.email, password_hash },
      select: { id: true, name: true, email: true, createdAt: true },
    });
  }
}
