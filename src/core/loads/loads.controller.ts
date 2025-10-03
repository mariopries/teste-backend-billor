import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards';
import { CreateLoadDto, LoadsService } from './loads.service';

@Controller('loads')
@ApiTags('loads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiForbiddenResponse({ description: 'Forbidden' })
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

  @Get(':id/events')
  findEvents(@Param('id') id: string) {
    return this.loads.findEvents(id);
  }
}
