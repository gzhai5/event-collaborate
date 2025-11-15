import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum EventAction {
  MERGE = 'MERGE',
}

@Entity('audit_log')
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  oldEventId: string;

  @Column({ type: 'varchar', nullable: false })
  action: EventAction;

  @Column({ type: 'varchar', nullable: false })
  newEventId: string;

  @Column({ type: 'varchar', nullable: false })
  userId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  timestamp: Date;
}
