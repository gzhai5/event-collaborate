import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventService } from './event.service';
import { EventEntity, EventStatus } from 'src/event/entities/event.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { AuditLogEntity, EventAction } from 'src/common/auditlog.entity';
import { HttpException } from '@nestjs/common';

import { ObjectLiteral } from 'typeorm';

type MockRepo<T extends ObjectLiteral = any> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const createMockRepo = (): MockRepo => ({
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
});

describe('EventService', () => {
  let service: EventService;
  let userRepo: MockRepo<UserEntity>;
  let eventRepo: MockRepo<EventEntity>;
  let auditLogRepo: MockRepo<AuditLogEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: createMockRepo(),
        },
        {
          provide: getRepositoryToken(EventEntity),
          useValue: createMockRepo(),
        },
        {
          provide: getRepositoryToken(AuditLogEntity),
          useValue: createMockRepo(),
        },
      ],
    }).compile();

    service = module.get<EventService>(EventService);
    userRepo = module.get(getRepositoryToken(UserEntity));
    eventRepo = module.get(getRepositoryToken(EventEntity));
    auditLogRepo = module.get(getRepositoryToken(AuditLogEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // tests
  describe('create', () => {
    it('should create and save an event', async () => {
      const createEventDto = {
        title: 'Test Event',
        description: 'This is a test event',
        status: EventStatus.TODO,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
      };
      const event = new EventEntity();
      eventRepo.create!.mockReturnValue(event);
      eventRepo.save!.mockResolvedValue(event);
      const result: EventEntity = await service.create(createEventDto);
      expect(result).toBe(event);
    });
  });

  describe('findAll', () => {
    it('should return all events', async () => {
      const events: EventEntity[] = [
        {
          id: '1',
          title: 'Event 1',
          description: 'Desc 1',
          status: EventStatus.TODO,
          startTime: new Date('2025-01-01T10:00:00Z'),
          endTime: new Date('2025-01-01T11:00:00Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
          mergedFrom: [],
          invitees: [],
        },
        {
          id: '2',
          title: 'Event 2',
          description: 'Desc 2',
          status: EventStatus.TODO,
          startTime: new Date('2025-01-01T12:30:00Z'),
          endTime: new Date('2025-01-01T13:30:00Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
          mergedFrom: [],
          invitees: [],
        },
      ];
      eventRepo.find!.mockResolvedValue(events);
      const result = await service.findAll();
      expect(result).toHaveLength(2);
      expect(result).toBe(events);
    });
  });

  describe('findOne', () => {
    it('should return an event by ID', async () => {
      const events: EventEntity[] = [
        {
          id: '1',
          title: 'Event 1',
          description: 'Desc 1',
          status: EventStatus.TODO,
          startTime: new Date('2025-01-01T10:00:00Z'),
          endTime: new Date('2025-01-01T11:00:00Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
          mergedFrom: [],
          invitees: [],
        },
        {
          id: '2',
          title: 'Event 2',
          description: 'Desc 2',
          status: EventStatus.TODO,
          startTime: new Date('2025-01-01T12:30:00Z'),
          endTime: new Date('2025-01-01T13:30:00Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
          mergedFrom: [],
          invitees: [],
        },
      ];
      eventRepo.findOneBy!.mockResolvedValue(events[0]);
      const event = events[0];
      const result = await service.findOne(1);
      expect(result).toBe(event);
    });
  });

  describe('update', () => {
    it('should update an existing event', async () => {
      const existingEvent: EventEntity = {
        id: '1',
        title: 'Event 1',
        description: 'Desc 1',
        status: EventStatus.TODO,
        startTime: new Date('2025-01-01T10:00:00Z'),
        endTime: new Date('2025-01-01T11:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
        mergedFrom: [],
        invitees: [],
      };
      const updateEventDto = {
        title: 'Updated Event 1',
        description: 'Updated Desc 1',
        status: EventStatus.COMPLETED,
      };
      const updatedEvent: EventEntity = {
        ...existingEvent,
        ...updateEventDto,
      };
      eventRepo.findOneBy!.mockResolvedValue(existingEvent);
      eventRepo.merge!.mockReturnValue(updatedEvent);
      const result = await service.update(1, updateEventDto);
      expect(result).toBe(updatedEvent);
    });
  });

  describe('remove', () => {
    it('should remove an existing event', async () => {
      const existingEvent: EventEntity = {
        id: '1',
        title: 'Event 1',
        description: 'Desc 1',
        status: EventStatus.TODO,
        startTime: new Date('2025-01-01T10:00:00Z'),
        endTime: new Date('2025-01-01T11:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
        mergedFrom: [],
        invitees: [],
      };
      eventRepo.findOneBy!.mockResolvedValue(existingEvent);
      eventRepo.remove!.mockResolvedValue(existingEvent);
      const result = await service.remove(1);
      expect(result).toBe(existingEvent);
    });
  });

  describe('mergeAllEvents', () => {
    // case 1: user not found
    it('mergeAllEvents: should throw if user not found', async () => {
      userRepo.findOne!.mockResolvedValue(null);

      await expect(service.mergeAllEvents(1)).rejects.toEqual(
        new HttpException('User not found', 404),
      );
    });
    // case 2: less than 2 events
    it('mergeAllEvents: should return events as-is if less than 2', async () => {
      const event: EventEntity = {
        id: 'e1',
        title: 'Event 1',
        description: 'Desc 1',
        status: EventStatus.TODO,
        startTime: new Date('2025-01-01T10:00:00Z'),
        endTime: new Date('2025-01-01T11:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
        mergedFrom: [],
        invitees: [],
      };

      userRepo.findOne!.mockResolvedValue({
        id: '1',
        events: [event] as EventEntity[],
      } as UserEntity);
      const result1 = await service.mergeAllEvents(1);
      expect(result1).toHaveLength(1);
      expect(result1[0].id).toBe('e1');
      userRepo.findOne!.mockResolvedValue({
        id: '1',
        events: [] as EventEntity[],
      } as UserEntity);
      const result = await service.mergeAllEvents(1);
      expect(result).toHaveLength(0);
      expect(result[0].id).toBe('e1');
    });
    // case 3: merge overlapping events
    it('mergeAllEvents: should merge overlapping events', async () => {
      const events: EventEntity[] = [
        {
          id: 'e1',
          title: 'Event 1',
          description: 'Desc 1',
          status: EventStatus.TODO,
          startTime: new Date('2025-01-01T10:00:00Z'),
          endTime: new Date('2025-01-01T11:50:00Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
          mergedFrom: [],
          invitees: [],
        },
        {
          id: 'e2',
          title: 'Event 2',
          description: 'Desc 2',
          status: EventStatus.TODO,
          startTime: new Date('2025-01-01T11:30:00Z'),
          endTime: new Date('2025-01-01T12:30:00Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
          mergedFrom: [],
          invitees: [],
        },
        {
          id: 'e3',
          title: 'Event 3',
          description: 'Desc 3',
          status: EventStatus.TODO,
          startTime: new Date('2025-01-01T12:00:00Z'),
          endTime: new Date('2025-01-01T13:00:00Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
          mergedFrom: [],
          invitees: [],
        },
        {
          id: 'e4',
          title: 'Event 4',
          description: 'Desc 4',
          status: EventStatus.TODO,
          startTime: new Date('2025-01-01T13:30:00Z'),
          endTime: new Date('2025-01-01T16:30:00Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
          mergedFrom: [],
          invitees: [],
        },
        {
          id: 'e5',
          title: 'Event 5',
          description: 'Desc 5',
          status: EventStatus.TODO,
          startTime: new Date('2025-01-01T15:00:00Z'),
          endTime: new Date('2025-01-01T16:00:00Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
          mergedFrom: [],
          invitees: [],
        },
      ];
      userRepo.findOne!.mockResolvedValue({
        id: '1',
        events: events,
      } as UserEntity);

      auditLogRepo.create!.mockImplementation(
        (data: Partial<AuditLogEntity>): AuditLogEntity => ({
          ...(data as AuditLogEntity),
          id: 'log-id',
        }),
      );
      const result = await service.mergeAllEvents(1);
      expect(result).toHaveLength(2);
      const [merged1, merged2] = result;

      // First merged block: e1 + e2 + e3
      expect(merged1.id).toBe('e1');
      expect(merged1.startTime.toISOString()).toBe(
        new Date('2025-01-01T10:00:00Z').toISOString(),
      );
      expect(merged1.endTime.toISOString()).toBe(
        new Date('2025-01-01T13:00:00Z').toISOString(),
      );
      expect(merged1.mergedFrom).toEqual(['e2', 'e3']);
      expect(merged1.title).toBe('Event 1&Event 2&Event 3');

      // Second merged block: e4 + e5
      expect(merged2.id).toBe('e4');
      expect(merged2.startTime.toISOString()).toBe(
        new Date('2025-01-01T13:30:00Z').toISOString(),
      );
      expect(merged2.endTime.toISOString()).toBe(
        new Date('2025-01-01T16:30:00Z').toISOString(),
      );
      expect(merged2.mergedFrom).toEqual(['e5']);
      expect(merged2.title).toBe('Event 4&Event 5');

      // user was saved with merged events
      expect(userRepo.save).toHaveBeenCalledTimes(1);
      const savedUserArg = userRepo.save!.mock.calls[0][0] as UserEntity;
      expect(savedUserArg.events).toHaveLength(2);

      // audit logs assertions
      // - e2 merged into e1
      // - e3 merged into e1
      // - e5 merged into e4
      expect(auditLogRepo.create).toHaveBeenCalledTimes(3);
      expect(auditLogRepo.save).toHaveBeenCalledTimes(1);

      const [savedLogs] = auditLogRepo.save!.mock.calls[0] as [
        AuditLogEntity[],
      ];
      expect(savedLogs).toHaveLength(3);

      expect(savedLogs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            oldEventId: 'e2',
            newEventId: 'e1',
            action: EventAction.MERGE,
            userId: '1',
          }),
          expect.objectContaining({
            oldEventId: 'e3',
            newEventId: 'e1',
            action: EventAction.MERGE,
            userId: '1',
          }),
          expect.objectContaining({
            oldEventId: 'e5',
            newEventId: 'e4',
            action: EventAction.MERGE,
            userId: '1',
          }),
        ]),
      );
    });
  });
});
