import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssignmentStatus,
  LoadStatus,
  Prisma,
  type DriverLoadAssignment,
} from '@prisma/client';
import { IsEnum, IsUUID } from 'class-validator';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PubSubService } from '../../infrastructure/messaging/pubsub.service';

export class CreateAssignmentDto {
  @IsUUID()
  driverId!: string;

  @IsUUID()
  loadId!: string;
}

export class UpdateAssignmentStatusDto {
  @IsEnum(AssignmentStatus)
  status!: AssignmentStatus;
}

@Injectable()
export class AssignmentsService {
  private readonly loadsCacheKeyAll = 'loads:all';

  constructor(
    private readonly prisma: PrismaService,
    private readonly pubsub: PubSubService,
    private readonly audit: AuditService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async create(dto: CreateAssignmentDto) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: dto.driverId },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const load = await this.prisma.load.findUnique({
      where: { id: dto.loadId },
    });
    if (!load) throw new NotFoundException('Load not found');
    if (load.status !== LoadStatus.OPEN) {
      throw new BadRequestException('Load must be OPEN to assign');
    }

    const active = await this.prisma.driverLoadAssignment.findFirst({
      where: { driverId: dto.driverId, status: AssignmentStatus.ASSIGNED },
    });
    if (active) {
      throw new BadRequestException('Driver already has an active assignment');
    }

    let result: DriverLoadAssignment;
    try {
      result = await this.prisma.$transaction(async (tx) => {
        const assignment = await tx.driverLoadAssignment.create({
          data: {
            driverId: dto.driverId,
            loadId: dto.loadId,
            status: AssignmentStatus.ASSIGNED,
          },
        });
        await tx.load.update({
          where: { id: dto.loadId },
          data: { status: LoadStatus.ASSIGNED },
        });
        await tx.loadEvent.create({
          data: {
            loadId: dto.loadId,
            type: 'ASSIGNED',
            payload: { assignmentId: assignment.id, driverId: dto.driverId },
          },
        });
        return assignment;
      });
    } catch (e: unknown) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new BadRequestException(
          'Driver already has an active assignment',
        );
      }
      throw e;
    }

    await this.pubsub.publish('load.assigned', {
      assignmentId: result.id,
      driver,
      load: { ...load, status: LoadStatus.ASSIGNED },
    });

    await this.cacheManager.del(this.loadsCacheKeyAll);

    return result;
  }

  async findOne(id: string) {
    const assignment = await this.prisma.driverLoadAssignment.findUnique({
      where: { id },
      include: { driver: true, load: true },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    return assignment;
  }

  async updateStatus(id: string, dto: UpdateAssignmentStatusDto) {
    const assignment = await this.prisma.driverLoadAssignment.findUnique({
      where: { id },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    if (assignment.status !== AssignmentStatus.ASSIGNED) {
      throw new BadRequestException('Only active assignments can be updated');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const a = await tx.driverLoadAssignment.update({
        where: { id },
        data: { status: dto.status },
      });
      const newLoadStatus =
        dto.status === AssignmentStatus.COMPLETED
          ? LoadStatus.COMPLETED
          : LoadStatus.CANCELLED;
      await tx.load.update({
        where: { id: assignment.loadId },
        data: { status: newLoadStatus },
      });
      await tx.loadEvent.create({
        data: {
          loadId: assignment.loadId,
          type:
            dto.status === AssignmentStatus.COMPLETED
              ? 'LOAD_COMPLETED'
              : 'ASSIGNMENT_CANCELLED',
          payload: { assignmentId: assignment.id, newStatus: dto.status },
        },
      });
      return a;
    });

    await this.audit.appendEvent({
      type:
        dto.status === AssignmentStatus.COMPLETED
          ? 'LOAD_COMPLETED'
          : 'ASSIGNMENT_CANCELLED',
      driverId: assignment.driverId,
      loadId: assignment.loadId,
      payload: { assignmentId: assignment.id, newStatus: dto.status },
      timestamp: new Date(),
    });

    // Invalidate loads cache
    await this.cacheManager.del(this.loadsCacheKeyAll);

    return updated;
  }
}
