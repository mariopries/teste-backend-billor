import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { LoadStatus, type Load, type LoadEvent } from '@prisma/client';
import { IsEnum, IsString, MinLength } from 'class-validator';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export class CreateLoadDto {
  @ApiProperty({
    description: 'Cidade/Local de origem da carga',
    example: 'São Paulo',
  })
  @IsString()
  @MinLength(2)
  origin!: string;

  @ApiProperty({
    description: 'Cidade/Local de destino da carga',
    example: 'Rio de Janeiro',
  })
  @IsString()
  @MinLength(2)
  destination!: string;

  @ApiProperty({
    description: 'Tipo de carga',
    example: 'Eletrônicos',
  })
  @IsString()
  @MinLength(1)
  cargoType!: string;

  @ApiProperty({
    description: 'Status da carga',
    enum: LoadStatus,
    example: LoadStatus.OPEN,
    required: false,
  })
  @IsEnum(LoadStatus)
  status?: LoadStatus = LoadStatus.OPEN;
}

@Injectable()
export class LoadsService {
  private readonly cacheKeyAll = 'loads:all';

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
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

    try {
      await this.prisma.loadEvent.create({
        data: {
          loadId: created.id,
          type: 'LOAD_CREATED',
          payload: {
            origin: created.origin,
            destination: created.destination,
            cargoType: created.cargoType,
          },
        },
      });
    } catch {
      // ignore event persistence errors
    }

    await this.cacheManager.del(this.cacheKeyAll);

    return created;
  }

  async findAll(): Promise<{ source: 'cache' | 'db'; data: Load[] }> {
    const cached = await this.cacheManager.get<Load[]>(this.cacheKeyAll);
    if (cached) {
      return { source: 'cache' as const, data: cached };
    }

    const data = await this.prisma.load.findMany({
      orderBy: { createdAt: 'desc' },
    });

    await this.cacheManager.set(this.cacheKeyAll, data, 60_000);

    return { source: 'db' as const, data };
  }

  async findEvents(
    loadId: string,
  ): Promise<{ loadId: string; events: LoadEvent[] }> {
    const events: LoadEvent[] = await this.prisma.loadEvent.findMany({
      where: { loadId },
      orderBy: { createdAt: 'desc' },
    });
    return { loadId, events };
  }
}
