import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { DecideJoinDto } from './dto/decide-join.dto';
import { SendGroupMessageDto } from './dto/send-group-message.dto';
import { MemberReminderDto } from './dto/member-reminder.dto';
import { RemoveMemberDto } from './dto/remove-member.dto';
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

  // Aperçu public minimal d'un groupe par code d'invitation — écran 27.
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

  // Démarrage du cycle 1 — écran 30.
  @Post(':id/cycles/start')
  startCycles(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.groupsService.startCycles(id, user.sub);
  }

  // Statut de cotisation de chaque membre pour le cycle actif — écran 31.
  @Get(':id/cycle-status')
  getCycleStatus(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.groupsService.getCycleStatus(id, user.sub);
  }

  // Discussion du groupe — écran 41.
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

  // -------------------------------------------------------------------------
  // Phase 4 — Membres & administration (écrans 42-53)
  // -------------------------------------------------------------------------

  // Écran 42 — membres + demandes en attente (admin).
  @Get(':id/members')
  listMembers(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.groupsService.listMembers(id, user.sub);
  }

  // Écran 46 — profil d'un membre (score fiabilité, métriques ledger).
  @Get(':id/members/:memberId')
  getMemberProfile(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.groupsService.getMemberProfile(id, user.sub, memberId);
  }

  // Écran 47 — rappel manuel à un membre en retard (notification + SMS).
  @Post(':id/members/:memberId/reminder')
  sendReminder(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: MemberReminderDto,
  ) {
    return this.groupsService.sendContributionReminder(id, user.sub, memberId, dto);
  }

  // Écran 45 — retrait d'un membre par l'admin.
  @Post(':id/remove-member')
  removeMember(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: RemoveMemberDto,
  ) {
    return this.groupsService.removeMember(id, user.sub, dto);
  }

  // Écran 50 — aperçu de sortie volontaire (montants calculés serveur).
  @Get(':id/exit-preview')
  exitPreview(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.groupsService.exitPreview(id, user.sub);
  }

  // Écran 52 — demandes de sortie en attente (admin) + montants.
  @Get(':id/exit-requests')
  listExitRequests(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.groupsService.listExitRequests(id, user.sub);
  }

  // Désignation du caissier (admin) — Option A, écran 48.
  @Post(':id/cashier')
  assignCashier(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AssignCashierDto,
  ) {
    return this.groupsService.assignCashier(id, user.sub, dto);
  }

  // Enregistrement du compte de dépôt (caissier) — écran 49.
  @Post(':id/deposit-account')
  registerDepositAccount(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: RegisterDepositAccountDto,
  ) {
    return this.groupsService.registerDepositAccount(id, user.sub, dto);
  }

  // Sortie volontaire d'un membre (le membre lui-même) — écran 50.
  @Post(':id/exit-request')
  requestExit(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: RequestGroupExitDto,
  ) {
    return this.groupsService.requestExit(id, user.sub, dto);
  }

  // Décision de l'admin sur une demande de sortie volontaire — écran 52.
  @Post(':id/exit-decision')
  decideExit(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: DecideGroupExitDto,
  ) {
    return this.groupsService.decideExit(id, user.sub, dto);
  }
}
