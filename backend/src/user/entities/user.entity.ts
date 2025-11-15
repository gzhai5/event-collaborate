import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { EventEntity } from 'src/event/entities/event.entity';

@Entity('user')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'varchar', unique: true, nullable: false })
  email: string;

  @ManyToMany(() => EventEntity, (event) => event.invitees)
  events: EventEntity[];
}
