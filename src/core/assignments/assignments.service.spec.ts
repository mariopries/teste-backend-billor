import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AssignmentStatus, LoadStatus } from '@prisma/client';
import { AssignmentsService } from './assignments.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PubSubService } from '../../infrastructure/messaging/pubsub.service';
import { AuditService } from '../../infrastructure/audit/audit.service';

/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

describe('AssignmentsService', () => {
  let service: AssignmentsService;
  let prisma: PrismaService;
  let pubsub: PubSubService;
  let audit: AuditService;
  let cache: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

  const mockDriver = {
    id: 'driver-1',
    name: 'John Doe',
    licenseNumber: 'ABC123',
    status: 'ACTIVE' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLoad = {
    id: 'load-1',
    origin: 'City A',
    destination: 'City B',
    cargoType: 'Electronics',
    status: LoadStatus.OPEN,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    cache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentsService,
        {
          provide: PrismaService,
          useValue: {
            driver: {
              findUnique: jest.fn(),
            },
            load: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            driverLoadAssignment: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: PubSubService,
          useValue: {
            publish: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            appendEvent: jest.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: cache,
        },
      ],
    }).compile();

    service = module.get<AssignmentsService>(AssignmentsService);
    prisma = module.get<PrismaService>(PrismaService);
    pubsub = module.get<PubSubService>(PubSubService);
    audit = module.get<AuditService>(AuditService);
  });

  describe('create', () => {
    it('should throw NotFoundException if driver not found', async () => {
      jest.spyOn(prisma.driver, 'findUnique').mockResolvedValue(null);

      await expect(
        service.create({ driverId: 'invalid', loadId: 'load-1' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.driver.findUnique).toHaveBeenCalledWith({
        where: { id: 'invalid' },
      });
    });

    it('should throw NotFoundException if load not found', async () => {
      jest.spyOn(prisma.driver, 'findUnique').mockResolvedValue(mockDriver);
      jest.spyOn(prisma.load, 'findUnique').mockResolvedValue(null);

      await expect(
        service.create({ driverId: 'driver-1', loadId: 'invalid' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if load is not OPEN', async () => {
      jest.spyOn(prisma.driver, 'findUnique').mockResolvedValue(mockDriver);
      jest
        .spyOn(prisma.load, 'findUnique')
        .mockResolvedValue({ ...mockLoad, status: LoadStatus.ASSIGNED });

      await expect(
        service.create({ driverId: 'driver-1', loadId: 'load-1' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create({ driverId: 'driver-1', loadId: 'load-1' }),
      ).rejects.toThrow('Load must be OPEN to assign');
    });

    it('should throw BadRequestException if driver already has active assignment', async () => {
      jest.spyOn(prisma.driver, 'findUnique').mockResolvedValue(mockDriver);
      jest.spyOn(prisma.load, 'findUnique').mockResolvedValue(mockLoad);
      jest.spyOn(prisma.driverLoadAssignment, 'findFirst').mockResolvedValue({
        id: 'existing-assignment',
        driverId: 'driver-1',
        loadId: 'other-load',
        assignedAt: new Date(),
        status: AssignmentStatus.ASSIGNED,
      });

      await expect(
        service.create({ driverId: 'driver-1', loadId: 'load-1' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create({ driverId: 'driver-1', loadId: 'load-1' }),
      ).rejects.toThrow('Driver already has an active assignment');
    });

    it('should create assignment successfully when all validations pass', async () => {
      const mockAssignment = {
        id: 'assignment-1',
        driverId: 'driver-1',
        loadId: 'load-1',
        assignedAt: new Date(),
        status: AssignmentStatus.ASSIGNED,
      };

      jest.spyOn(prisma.driver, 'findUnique').mockResolvedValue(mockDriver);
      jest.spyOn(prisma.load, 'findUnique').mockResolvedValue(mockLoad);
      jest
        .spyOn(prisma.driverLoadAssignment, 'findFirst')
        .mockResolvedValue(null);
      jest
        .spyOn(prisma, '$transaction')
        .mockResolvedValue(mockAssignment as never);
      jest.spyOn(pubsub, 'publish').mockResolvedValue('message-id');
      jest.spyOn(cache, 'del').mockResolvedValue(undefined);

      const result = await service.create({
        driverId: 'driver-1',
        loadId: 'load-1',
      });

      expect(result).toEqual(mockAssignment);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(pubsub.publish).toHaveBeenCalledWith('load.assigned', {
        assignmentId: mockAssignment.id,
        driver: mockDriver,
        load: { ...mockLoad, status: LoadStatus.ASSIGNED },
      });
      expect(cache.del).toHaveBeenCalledWith('loads:all');
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if assignment not found', async () => {
      jest
        .spyOn(prisma.driverLoadAssignment, 'findUnique')
        .mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return assignment with driver and load', async () => {
      const mockAssignment = {
        id: 'assignment-1',
        driverId: 'driver-1',
        loadId: 'load-1',
        assignedAt: new Date(),
        status: AssignmentStatus.ASSIGNED,
        driver: mockDriver,
        load: mockLoad,
      };

      jest
        .spyOn(prisma.driverLoadAssignment, 'findUnique')
        .mockResolvedValue(mockAssignment);

      const result = await service.findOne('assignment-1');

      expect(result).toEqual(mockAssignment);
      expect(prisma.driverLoadAssignment.findUnique).toHaveBeenCalledWith({
        where: { id: 'assignment-1' },
        include: { driver: true, load: true },
      });
    });
  });

  describe('updateStatus', () => {
    it('should throw NotFoundException if assignment not found', async () => {
      jest
        .spyOn(prisma.driverLoadAssignment, 'findUnique')
        .mockResolvedValue(null);

      await expect(
        service.updateStatus('invalid-id', {
          status: AssignmentStatus.COMPLETED,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if assignment is not ASSIGNED', async () => {
      jest.spyOn(prisma.driverLoadAssignment, 'findUnique').mockResolvedValue({
        id: 'assignment-1',
        driverId: 'driver-1',
        loadId: 'load-1',
        assignedAt: new Date(),
        status: AssignmentStatus.COMPLETED,
      });

      await expect(
        service.updateStatus('assignment-1', {
          status: AssignmentStatus.CANCELLED,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateStatus('assignment-1', {
          status: AssignmentStatus.CANCELLED,
        }),
      ).rejects.toThrow('Only active assignments can be updated');
    });

    it('should update assignment to COMPLETED and create audit event', async () => {
      const mockAssignment = {
        id: 'assignment-1',
        driverId: 'driver-1',
        loadId: 'load-1',
        assignedAt: new Date(),
        status: AssignmentStatus.ASSIGNED,
      };

      const updatedAssignment = {
        ...mockAssignment,
        status: AssignmentStatus.COMPLETED,
      };

      jest
        .spyOn(prisma.driverLoadAssignment, 'findUnique')
        .mockResolvedValue(mockAssignment);
      jest
        .spyOn(prisma, '$transaction')
        .mockResolvedValue(updatedAssignment as never);
      jest.spyOn(audit, 'appendEvent').mockResolvedValue(undefined);
      jest.spyOn(cache, 'del').mockResolvedValue(undefined);

      const result = await service.updateStatus('assignment-1', {
        status: AssignmentStatus.COMPLETED,
      });

      expect(result).toEqual(updatedAssignment);
      expect(audit.appendEvent).toHaveBeenCalledWith({
        type: 'LOAD_COMPLETED',
        driverId: 'driver-1',
        loadId: 'load-1',
        payload: {
          assignmentId: 'assignment-1',
          newStatus: AssignmentStatus.COMPLETED,
        },
        timestamp: expect.any(Date),
      });
      expect(cache.del).toHaveBeenCalledWith('loads:all');
    });

    it('should update assignment to CANCELLED and create audit event', async () => {
      const mockAssignment = {
        id: 'assignment-1',
        driverId: 'driver-1',
        loadId: 'load-1',
        assignedAt: new Date(),
        status: AssignmentStatus.ASSIGNED,
      };

      const updatedAssignment = {
        ...mockAssignment,
        status: AssignmentStatus.CANCELLED,
      };

      jest
        .spyOn(prisma.driverLoadAssignment, 'findUnique')
        .mockResolvedValue(mockAssignment);
      jest
        .spyOn(prisma, '$transaction')
        .mockResolvedValue(updatedAssignment as never);
      jest.spyOn(audit, 'appendEvent').mockResolvedValue(undefined);
      jest.spyOn(cache, 'del').mockResolvedValue(undefined);

      const result = await service.updateStatus('assignment-1', {
        status: AssignmentStatus.CANCELLED,
      });

      expect(result).toEqual(updatedAssignment);
      expect(audit.appendEvent).toHaveBeenCalledWith({
        type: 'ASSIGNMENT_CANCELLED',
        driverId: 'driver-1',
        loadId: 'load-1',
        payload: {
          assignmentId: 'assignment-1',
          newStatus: AssignmentStatus.CANCELLED,
        },
        timestamp: expect.any(Date),
      });
    });
  });
});
