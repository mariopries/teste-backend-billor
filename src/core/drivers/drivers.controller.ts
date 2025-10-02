import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { DriversService, CreateDriverDto } from './drivers.service';
import { JwtAuthGuard } from '../../common/guards';

@Controller('drivers')
@UseGuards(JwtAuthGuard)
export class DriversController {
  constructor(private readonly drivers: DriversService) {}

  @Post()
  create(@Body() dto: CreateDriverDto) {
    return this.drivers.create(dto);
  }
}
