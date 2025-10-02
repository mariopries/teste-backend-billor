import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { LoadStatus } from '@prisma/client';
import { LoadsService } from './loads.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';

/* eslint-disable @typescript-eslint/unbound-method */

describe('LoadsService', () => {
  let service: LoadsService;
  let prisma: PrismaService;
  let cache: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

  const mockLoads = [
    {
      id: 'load-1',
      origin: 'City A',
      destination: 'City B',
      cargoType: 'Electronics',
      status: LoadStatus.OPEN,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'load-2',
      origin: 'City C',
      destination: 'City D',
      cargoType: 'Furniture',
      status: LoadStatus.ASSIGNED,
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    },
  ];

  beforeEach(async () => {
    cache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoadsService,
        {
          provide: PrismaService,
          useValue: {
            load: {
              create: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: cache,
        },
      ],
    }).compile();

    service = module.get<LoadsService>(LoadsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    it('should create a load and invalidate cache', async () => {
      const createDto = {
        origin: 'City A',
        destination: 'City B',
        cargoType: 'Electronics',
        status: LoadStatus.OPEN,
      };

      const createdLoad = {
        id: 'load-1',
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.load, 'create').mockResolvedValue(createdLoad);
      jest.spyOn(cache, 'del').mockResolvedValue(undefined);

      const result = await service.create(createDto);

      expect(result).toEqual(createdLoad);
      expect(prisma.load.create).toHaveBeenCalledWith({
        data: {
          origin: createDto.origin,
          destination: createDto.destination,
          cargoType: createDto.cargoType,
          status: createDto.status,
        },
      });
      expect(cache.del).toHaveBeenCalledWith('loads:all');
    });

    it('should use default status OPEN if not provided', async () => {
      const createDto = {
        origin: 'City A',
        destination: 'City B',
        cargoType: 'Electronics',
      };

      const createdLoad = {
        id: 'load-1',
        ...createDto,
        status: LoadStatus.OPEN,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.load, 'create').mockResolvedValue(createdLoad);
      jest.spyOn(cache, 'del').mockResolvedValue(undefined);

      await service.create(createDto);

      expect(prisma.load.create).toHaveBeenCalledWith({
        data: {
          origin: createDto.origin,
          destination: createDto.destination,
          cargoType: createDto.cargoType,
          status: 'OPEN',
        },
      });
    });
  });

  describe('findAll', () => {
    it('should return cached data when cache hit', async () => {
      jest.spyOn(cache, 'get').mockResolvedValue(mockLoads);

      const result = await service.findAll();

      expect(result).toEqual({
        source: 'cache',
        data: mockLoads,
      });
      expect(cache.get).toHaveBeenCalledWith('loads:all');
      expect(prisma.load.findMany).not.toHaveBeenCalled();
      expect(cache.set).not.toHaveBeenCalled();
    });

    it('should fetch from DB and cache when cache miss', async () => {
      jest.spyOn(cache, 'get').mockResolvedValue(undefined);
      jest.spyOn(prisma.load, 'findMany').mockResolvedValue(mockLoads);
      jest.spyOn(cache, 'set').mockResolvedValue(undefined);

      const result = await service.findAll();

      expect(result).toEqual({
        source: 'db',
        data: mockLoads,
      });
      expect(cache.get).toHaveBeenCalledWith('loads:all');
      expect(prisma.load.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
      expect(cache.set).toHaveBeenCalledWith('loads:all', mockLoads, 60_000);
    });

    it('should cache data for 60 seconds (60000ms)', async () => {
      jest.spyOn(cache, 'get').mockResolvedValue(undefined);
      jest.spyOn(prisma.load, 'findMany').mockResolvedValue(mockLoads);
      jest.spyOn(cache, 'set').mockResolvedValue(undefined);

      await service.findAll();

      expect(cache.set).toHaveBeenCalledWith(
        'loads:all',
        mockLoads,
        60_000, // 60 seconds in milliseconds
      );
    });

    it('should return empty array when no loads exist', async () => {
      jest.spyOn(cache, 'get').mockResolvedValue(undefined);
      jest.spyOn(prisma.load, 'findMany').mockResolvedValue([]);
      jest.spyOn(cache, 'set').mockResolvedValue(undefined);

      const result = await service.findAll();

      expect(result).toEqual({
        source: 'db',
        data: [],
      });
      expect(cache.set).toHaveBeenCalledWith('loads:all', [], 60_000);
    });

    it('should order loads by createdAt descending', async () => {
      jest.spyOn(cache, 'get').mockResolvedValue(undefined);
      jest.spyOn(prisma.load, 'findMany').mockResolvedValue(mockLoads);
      jest.spyOn(cache, 'set').mockResolvedValue(undefined);

      await service.findAll();

      expect(prisma.load.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('cache invalidation', () => {
    it('should invalidate cache after creating a load', async () => {
      const createDto = {
        origin: 'City A',
        destination: 'City B',
        cargoType: 'Electronics',
      };

      const createdLoad = {
        id: 'load-1',
        ...createDto,
        status: LoadStatus.OPEN,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.load, 'create').mockResolvedValue(createdLoad);
      jest.spyOn(cache, 'del').mockResolvedValue(undefined);

      await service.create(createDto);

      expect(cache.del).toHaveBeenCalledWith('loads:all');
      expect(cache.del).toHaveBeenCalledTimes(1);
    });
  });
});
