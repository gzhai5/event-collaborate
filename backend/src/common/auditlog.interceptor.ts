/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity, EventAction } from './auditlog.entity';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const request = http.getRequest<any>();

    const user = request.user; // 一般由 JWT AuthGuard 注入
    const userId = user?.id || user?.sub;

    const body = request.body;
    const oldEventId = body.oldEventId;
    const action = EventAction.MERGE;

    return next.handle().pipe(
      tap((result) => {
        const newEventId =
          result?.id || result?.newEventId || body.newEventId || '';

        const log = this.auditRepo.create({
          oldEventId,
          newEventId,
          action,
          userId,
        });
        void this.auditRepo.save(log);
      }),
    );
  }
}
