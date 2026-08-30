import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { ContributeEventDto } from './dto/contribute-event.dto';

@UseGuards(JwtAuthGuard)
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateEventDto) {
    return this.eventsService.create(user.sub, dto);
  }

  @Get('group/:groupId')
  findForGroup(@Param('groupId') groupId: string) {
    return this.eventsService.findForGroup(groupId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Post(':id/contribute')
  contribute(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ContributeEventDto,
  ) {
    return this.eventsService.contribute(id, user.sub, dto);
  }

  @Post(':id/close')
  close(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.eventsService.close(id, user.sub);
  }
}
