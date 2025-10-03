import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { DriverStatus, Prisma } from '@prisma/client';
import { IsEnum, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export class CreateDriverDto {
  @ApiProperty({
    description: 'Nome completo do motorista',
    example: 'João Silva',
    minLength: 2,
  })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({
    description: 'Número da habilitação do motorista',
    example: 'ABC1234567',
    minLength: 3,
  })
  @IsString()
  @MinLength(3)
  licenseNumber!: string;

  @ApiProperty({
    description: 'Status do motorista',
    enum: DriverStatus,
    example: DriverStatus.ACTIVE,
    required: false,
  })
  @IsEnum(DriverStatus)
  status?: DriverStatus = DriverStatus.ACTIVE;
}

@Injectable()
export class DriversService {
  private readonly cacheKeyAll = 'drivers:all';

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(dto: CreateDriverDto) {
    try {
      return await this.prisma.driver.create({
        data: {
          name: dto.name,
          licenseNumber: dto.licenseNumber,
          status: dto.status ?? 'ACTIVE',
        },
      });
    } catch (e: unknown) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new BadRequestException('licenseNumber must be unique');
      }
      throw e;
    }
  }

  async getAll() {
    const cached = await this.cacheManager.get<unknown>(this.cacheKeyAll);
    if (cached) {
      return { source: 'cache' as const, data: cached };
    }
    const data = await this.prisma.driver.findMany({
      orderBy: { createdAt: 'desc' },
    });
    await this.cacheManager.set(this.cacheKeyAll, data, 60_000);
    return { source: 'db' as const, data };
  }
}
