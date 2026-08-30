import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { AssignCashierDto } from './dto/assign-cashier.dto';
import { RegisterDepositAccountDto } from './dto/register-deposit-account.dto';
import { RequestGroupExitDto } from './dto/request-exit.dto';
import { DecideGroupExitDto } from './dto/decide-exit.dto';

@UseGuards(JwtAuthGuard)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateGroupDto) {
    return this.groupsService.create(user.sub, dto);
  }

  @Get()
  findMine(@CurrentUser() user: JwtPayload) {
    return this.groupsService.findForUser(user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.groupsService.findOne(id);
  }

  @Post('join')
  join(@CurrentUser() user: JwtPayload, @Body() dto: JoinGroupDto) {
    return this.groupsService.joinByInviteCode(user.sub, dto);
  }

  // Désignation du caissier (admin) — Option A, cf. cahier des charges §7.
  @Post(':id/cashier')
  assignCashier(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AssignCashierDto,
  ) {
    return this.groupsService.assignCashier(id, user.sub, dto);
  }

  // Enregistrement du compte de dépôt (caissier uniquement).
  @Post(':id/deposit-account')
  registerDepositAccount(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: RegisterDepositAccountDto,
  ) {
    return this.groupsService.registerDepositAccount(id, user.sub, dto);
  }

  // Sortie volontaire d'un membre (le membre lui-même).
  @Post(':id/exit-request')
  requestExit(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: RequestGroupExitDto,
  ) {
    return this.groupsService.requestExit(id, user.sub, dto);
  }

  // Décision de l'admin sur une demande de sortie volontaire.
  @Post(':id/exit-decision')
  decideExit(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: DecideGroupExitDto,
  ) {
    return this.groupsService.decideExit(id, user.sub, dto);
  }
}
