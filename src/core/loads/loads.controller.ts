import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { LoadsService, CreateLoadDto } from './loads.service';
import { JwtAuthGuard } from '../../common/guards';

@Controller('loads')
@UseGuards(JwtAuthGuard)
export class LoadsController {
  constructor(private readonly loads: LoadsService) {}

  @Post()
  create(@Body() dto: CreateLoadDto) {
    return this.loads.create(dto);
  }

  @Get()
  findAll() {
    return this.loads.findAll();
  }
}
