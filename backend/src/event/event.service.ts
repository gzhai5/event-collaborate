/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { HttpException, Injectable } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { EventEntity } from './entities/event.entity';
import { Logger } from '@nestjs/common';
import { UserEntity } from 'src/user/entities/user.entity';
import { AuditLogEntity, EventAction } from 'src/common/auditlog.entity';
import { AiService } from 'src/ai/ai.service';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,

    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>,

    private readonly aiService: AiService,
    private readonly dataSource: DataSource,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<EventEntity> {
    const userIds = createEventDto.inviteeIds;
    if (!userIds || userIds.length === 0) {
      throw new HttpException(
        'At least one inviteeId is required to create an event',
        400,
      );
    }

    const users = await this.userRepository.findBy({ id: In(userIds) });
    const eventData = this.eventRepository.create({
      ...createEventDto,
      invitees: users,
    });
    return await this.eventRepository.save(eventData);
  }

  findAll() {
    return this.eventRepository.find();
  }

  async findOne(id: string) {
    const eventData = await this.eventRepository.findOneBy({
      id: id,
    });
    if (!eventData) {
      this.logger.error(`Event with ID ${id} not found.`);
      throw new HttpException('Event not found', 404);
    }
    return eventData;
  }

  async update(id: string, updateEventDto: UpdateEventDto) {
    const existingEvent = await this.eventRepository.findOneBy({
      id: id,
    });
    if (!existingEvent) {
      this.logger.error(`Event with ID ${id} not found for update.`);
      throw new HttpException('Event not found', 404);
    }
    const eventData = this.eventRepository.merge(existingEvent, updateEventDto);
    return await this.eventRepository.save(eventData);
  }

  async remove(id: string) {
    const existingEvent = await this.findOne(id);
    return await this.eventRepository.remove(existingEvent);
  }

  async mergeAllEvents(userId: string) {
    this.logger.log(`Merging all events for user ID ${userId}`);
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['events'],
    });
    if (!user) {
      this.logger.error(`User with ID ${userId} not found.`);
      throw new HttpException('User not found', 404);
    }

    const oldEvents = [...(user.events || [])];
    const eventsLenBefore = oldEvents.length;
    if (oldEvents.length < 2) {
      this.logger.log(
        `Not enough events to merge for user ID ${userId}. Just ${eventsLenBefore} event(s).`,
      );
      return oldEvents || [];
    }

    // Merge Overlapping Events
    const events = structuredClone(
      oldEvents.map(
        (e) =>
          ({
            id: e.id,
            title: e.title,
            description: e.description,
            status: e.status,
            startTime: e.startTime,
            endTime: e.endTime,
            mergedFrom: e.mergedFrom,
            createdAt: e.createdAt,
            updatedAt: e.updatedAt,
            aiSummary: e.aiSummary,
          }) as EventEntity,
      ),
    );
    const sortedEvents = events.sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
    let prev = sortedEvents[0];
    const merged: EventEntity[] = [];
    const auditLogs: AuditLogEntity[] = [];
    for (let i = 1; i < sortedEvents.length; i++) {
      if (prev.endTime >= sortedEvents[i].startTime) {
        // mark prev as “merged” the first time
        if (!prev.mergedFrom || prev.mergedFrom.length === 0) {
          prev.mergedFrom = [prev.id];
        }
        prev.mergedFrom.push(sortedEvents[i].id);

        prev.endTime = new Date(
          Math.max(prev.endTime.getTime(), sortedEvents[i].endTime.getTime()),
        );
        prev.title += `&${sortedEvents[i].title}`;
        prev.status = sortedEvents[i].status;

        auditLogs.push(
          this.auditLogRepository.create({
            oldEventId: sortedEvents[i].id,
            newEventId: prev.id,
            action: EventAction.MERGE,
            userId: userId.toString(),
          }),
        );
      } else {
        merged.push(prev);
        prev = sortedEvents[i];
      }
    }
    merged.push(prev);

    // AI summary for merged events
    for (const mergedEvent of merged) {
      if (mergedEvent.mergedFrom && mergedEvent.mergedFrom.length >= 2) {
        const sourceEvents = oldEvents.filter((e) =>
          mergedEvent.mergedFrom!.includes(e.id),
        );

        const summary = await this.aiService.summarizeMergedEvent(
          mergedEvent,
          sourceEvents.map((e) => ({ id: e.id, title: e.title })),
        );
        mergedEvent.aiSummary = summary;
      }
    }

    // Update user entities with merged events
    user.events = merged;
    await this.userRepository.save(user);

    // Save audit logs
    if (auditLogs.length > 0) {
      await this.auditLogRepository.save(auditLogs);
      this.logger.log(
        `Created ${auditLogs.length} audit log entries for merged events.`,
      );
    }
    this.logger.log(
      `Finish Merging ${eventsLenBefore} events into ${merged.length} events for user ID ${userId}.`,
    );
    return merged;
  }

  async getConflictingEvents(userId: string) {
    this.logger.log(`Retrieving conflicting events for user ID ${userId}`);
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['events'],
    });
    if (!user) {
      this.logger.error(`User with ID ${userId} not found.`);
      throw new HttpException('User not found', 404);
    }

    const events = [...(user.events || [])];
    if (events.length < 2) {
      this.logger.log(
        `Not enough events to have conflicts for user ID ${userId}. Just ${events.length} event(s).`,
      );
      return events || [];
    }

    // Find all Overlapping Events
    const sortedEvents = events.sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime(),
    );
    const conflictEventIds = new Set<string>();
    for (let i = 1; i < sortedEvents.length; i++) {
      const prev = sortedEvents[i - 1];
      const curr = sortedEvents[i];
      if (prev.endTime >= curr.startTime) {
        conflictEventIds.add(prev.id);
        conflictEventIds.add(curr.id);
      }
    }

    const conflictingEvents = sortedEvents.filter((event) =>
      conflictEventIds.has(event.id),
    );
    this.logger.log(
      `Found ${conflictingEvents.length} conflicting events from ${events.length} events for user ID ${userId}.`,
    );
    return conflictingEvents;
  }

  async createBatch(dtos: CreateEventDto[]): Promise<EventEntity[]> {
    if (!dtos || dtos.length === 0) {
      throw new HttpException('No events provided', 400);
    }
    if (dtos.length > 500) {
      throw new HttpException('Maximum 500 events per batch', 400);
    }

    const start = Date.now();

    const events = await this.dataSource.transaction(async (manager) => {
      // 1. Collect all unique inviteeIds across the batch
      const allInviteeIds = Array.from(
        new Set(
          dtos
            .flatMap((dto) => dto.inviteeIds || [])
            .map((id) => id.toString()),
        ),
      );

      let usersById = new Map<string, UserEntity>();
      if (allInviteeIds.length) {
        const users = await manager.find(UserEntity, {
          where: { id: In(allInviteeIds) },
        });
        usersById = new Map(users.map((u) => [u.id, u]));
      }

      // 2. Create EventEntity instances
      const entities = dtos.map((dto) => {
        const invitees: UserEntity[] = (dto.inviteeIds || [])
          .map((id) => usersById.get(id))
          .filter((u): u is UserEntity => !!u);

        return manager.create(EventEntity, {
          title: dto.title,
          description: dto.description,
          status: dto.status,
          startTime: new Date(dto.startTime),
          endTime: new Date(dto.endTime),
          invitees,
          mergedFrom: dto.mergedFrom ?? undefined,
        });
      });
      const saved = await manager.save(EventEntity, entities);
      return saved;
    });

    const duration = Date.now() - start;
    this.logger.log(
      `Batch created ${events.length} events in ${duration}ms (limit 500).`,
    );

    return events;
  }
}
