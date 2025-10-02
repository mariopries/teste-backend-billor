import { BadRequestException, Injectable } from '@nestjs/common';
import { DriverStatus, Prisma } from '@prisma/client';
import { IsEnum, IsString, MinLength } from 'class-validator';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export class CreateDriverDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(3)
  licenseNumber!: string;

  @IsEnum(DriverStatus)
  status?: DriverStatus = DriverStatus.ACTIVE;
}

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService) {}

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
}
