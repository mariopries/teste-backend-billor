import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { UsersService, CreateUserDto } from './users.service';
import { JwtAuthGuard } from '../../common/guards';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }
}
