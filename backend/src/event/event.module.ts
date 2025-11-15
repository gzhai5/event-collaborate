import { Module } from '@nestjs/common';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { EventEntity } from './entities/event.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from 'src/user/entities/user.entity';
import { AuditLogEntity } from 'src/common/auditlog.entity';
import { AiService } from 'src/ai/ai.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EventEntity,
      UserEntity,
      AuditLogEntity,
      AiService,
    ]),
  ],
  controllers: [EventController],
  providers: [EventService],
  exports: [EventService],
})
export class EventModule {}
