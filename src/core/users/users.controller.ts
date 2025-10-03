import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards';
import { CreateUserDto, UsersService } from './users.service';

@Controller('users')
@ApiTags('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiForbiddenResponse({ description: 'Forbidden' })
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Get()
  findAll() {
    return this.users.getAll();
  }
}
