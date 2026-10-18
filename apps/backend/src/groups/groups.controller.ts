import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { DecideJoinDto } from './dto/decide-join.dto';
import { SendGroupMessageDto } from './dto/send-group-message.dto';
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

  // Aperçu public minimal d'un groupe par code d'invitation — écran 27
  // (« GROUPE TROUVÉ ») : nom, jauge membres, cotisation, périodicité,
  // mode. Aucune donnée personnelle des membres n'est exposée.
  @Post('preview')
  previewByInviteCode(@Body() dto: JoinGroupDto) {
    return this.groupsService.previewByInviteCode(dto.inviteCode);
  }

  // Adhésion par code : crée le membre en PENDING (inactif) — écran 28.
  @Post('join')
  join(@CurrentUser() user: JwtPayload, @Body() dto: JoinGroupDto) {
    return this.groupsService.joinByInviteCode(user.sub, dto);
  }

  // Décision de l'admin sur une demande d'adhésion en attente.
  @Post(':id/join-decision')
  decideJoin(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: DecideJoinDto,
  ) {
    return this.groupsService.decideJoin(id, user.sub, dto);
  }

  // Tirage au sort de l'ordre de rotation — écran 29.
  @Post(':id/rotation/draw')
  drawRotation(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.groupsService.drawRotation(id, user.sub);
  }

  // Validation de l'ordre tiré — écran 30.
  @Post(':id/rotation/confirm')
  confirmRotation(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.groupsService.confirmRotation(id, user.sub);
  }

  // Démarrage du cycle 1 — écran 30 (« Démarrer le cycle 1 »).
  @Post(':id/cycles/start')
  startCycles(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.groupsService.startCycles(id, user.sub);
  }

  // Statut de cotisation de chaque membre pour le cycle actif — écran 31
  // (Payé / En attente / En retard, bénéficiaire du tour, montant total).
  @Get(':id/cycle-status')
  getCycleStatus(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.groupsService.getCycleStatus(id, user.sub);
  }

  // Discussion du groupe — écran 41. Pagination simple : les N derniers
  // messages, antérieurs à `before` si fourni.
  @Get(':id/messages')
  listMessages(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('take') take?: string,
    @Query('before') before?: string,
  ) {
    return this.groupsService.listMessages(id, user.sub, {
      take: take ? Number(take) : undefined,
      before: before ? new Date(before) : undefined,
    });
  }

  @Post(':id/messages')
  sendMessage(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SendGroupMessageDto,
  ) {
    return this.groupsService.sendMessage(id, user.sub, dto);
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
