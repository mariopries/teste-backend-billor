import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards';
import { CreateDriverDto, DriversService } from './drivers.service';

@Controller('drivers')
@ApiTags('drivers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiForbiddenResponse({ description: 'Forbidden' })
export class DriversController {
  constructor(private readonly drivers: DriversService) {}

  @Post()
  create(@Body() dto: CreateDriverDto) {
    return this.drivers.create(dto);
  }

  @Get()
  findAll() {
    return this.drivers.getAll();
  }
}
