import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { LoadStatus } from '@prisma/client';
import type { Cache } from 'cache-manager';
import { IsEnum, IsString, MinLength } from 'class-validator';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export class CreateLoadDto {
  @IsString()
  @MinLength(2)
  origin!: string;

  @IsString()
  @MinLength(2)
  destination!: string;

  @IsString()
  @MinLength(1)
  cargoType!: string;

  @IsEnum(LoadStatus)
  status?: LoadStatus = LoadStatus.OPEN;
}

@Injectable()
export class LoadsService {
  private readonly cacheKeyAll = 'loads:all';

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async create(dto: CreateLoadDto) {
    const created = await this.prisma.load.create({
      data: {
        origin: dto.origin,
        destination: dto.destination,
        cargoType: dto.cargoType,
        status: dto.status ?? 'OPEN',
      },
    });
    await this.cache.del(this.cacheKeyAll);
    return created;
  }

  async findAll() {
    const cached = await this.cache.get(this.cacheKeyAll);
    if (cached) return { source: 'cache' as const, data: cached };

    const data = await this.prisma.load.findMany({
      orderBy: { createdAt: 'desc' },
    });
    await this.cache.set(this.cacheKeyAll, data, 60_000);
    return { source: 'db' as const, data };
  }
}
