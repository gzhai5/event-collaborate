import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  JoinTable,
  ManyToMany,
} from 'typeorm';
import { UserEntity } from 'src/user/entities/user.entity';

export enum EventStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
}

@Entity('event')
export class EventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: EventStatus, nullable: false })
  status: EventStatus;

  @Column({ type: 'timestamptz', nullable: false })
  startTime: Date;

  @Column({ type: 'timestamptz', nullable: false })
  endTime: Date;

  @ManyToMany(() => UserEntity, (user) => user.events, {
    cascade: true,
  })
  @JoinTable({
    name: 'event_invitees',
    joinColumn: { name: 'eventId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' },
  })
  invitees: UserEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  mergedFrom?: string[];

  @Column({ type: 'text', nullable: true })
  aiSummary?: string;
}
