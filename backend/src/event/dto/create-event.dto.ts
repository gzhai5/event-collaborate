import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
  IsUUID,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { EventStatus } from '../entities/event.entity';
import { Type } from 'class-transformer';

export class CreateEventDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(EventStatus)
  status: EventStatus;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  inviteeIds?: string[];

  @IsOptional()
  @IsArray()
  mergedFrom?: string[];
}

export class BatchCreateEventDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CreateEventDto)
  events: CreateEventDto[];
}
