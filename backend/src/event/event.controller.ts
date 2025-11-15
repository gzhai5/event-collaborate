import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { EventService } from './event.service';
import { CreateEventDto, BatchCreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Controller('event')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  create(@Body() createEventDto: CreateEventDto) {
    return this.eventService.create(createEventDto);
  }

  @Get()
  findAll() {
    return this.eventService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
    return this.eventService.update(+id, updateEventDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.eventService.remove(+id);
  }

  @Post('/merge-all/:userId')
  mergeAllEvents(@Param('userId') userId: string) {
    return this.eventService.mergeAllEvents(+userId);
  }

  @Get('/conflicts/:userId')
  getConflictingEvents(@Param('userId') userId: string) {
    return this.eventService.getConflictingEvents(+userId);
  }

  @Post('batch')
  async createBatch(@Body() dto: BatchCreateEventDto) {
    return this.eventService.createBatch(dto.events);
  }
}
