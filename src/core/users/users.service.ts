import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { createHash } from 'crypto';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import type { User } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({
    description: 'Nome do usuário',
    example: 'Admin Demo',
    minLength: 2,
  })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({
    description: 'Email do usuário',
    example: 'admin@demo.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'admin123',
    minLength: 3,
  })
  @IsString()
  @MinLength(3)
  password!: string;
}

@Injectable()
export class UsersService {
  private readonly cacheKeyAll = 'users:all';

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(
    dto: CreateUserDto,
  ): Promise<Pick<User, 'id' | 'name' | 'email' | 'createdAt'>> {
    const password_hash = createHash('sha256')
      .update(dto.password)
      .digest('hex');
    return this.prisma.user.create({
      data: { name: dto.name, email: dto.email, password_hash },
      select: { id: true, name: true, email: true, createdAt: true },
    });
  }

  async getAll(): Promise<{
    source: 'cache' | 'db';
    data: Pick<User, 'id' | 'name' | 'email' | 'createdAt'>[];
  }> {
    const cached = await this.cacheManager.get<
      Pick<User, 'id' | 'name' | 'email' | 'createdAt'>[]
    >(this.cacheKeyAll);
    if (cached) {
      return { source: 'cache' as const, data: cached };
    }
    const data = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    await this.cacheManager.set(this.cacheKeyAll, data, 60_000);
    return { source: 'db' as const, data };
  }
}
