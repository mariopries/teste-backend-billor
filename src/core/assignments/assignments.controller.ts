import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards';
import {
  ApiBearerAuth,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import {
  AssignmentsService,
  CreateAssignmentDto,
  UpdateAssignmentStatusDto,
} from './assignments.service';

@Controller('assignments')
@ApiTags('assignments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiForbiddenResponse({ description: 'Forbidden' })
export class AssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}

  @Post()
  create(@Body() dto: CreateAssignmentDto) {
    return this.assignments.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assignments.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAssignmentStatusDto,
  ) {
    return this.assignments.updateStatus(id, dto);
  }
}
