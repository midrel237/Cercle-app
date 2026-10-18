import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SmsService } from '../common/sms/sms.service';
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

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
  ) {}

  async create(userId: string, dto: CreateGroupDto) {
    const inviteCode = this.generateInviteCode();
    return this.prisma.group.create({
      data: {
        ...dto,
        inviteCode,
        createdById: userId,
        members: {
          create: { userId, role: 'ADMIN', rotationPosition: 1 },
        },
      },
      include: { members: true },
    });
  }

  async findForUser(userId: string) {
    return this.prisma.group.findMany({
      where: { members: { some: { userId, isActive: true } } },
      include: { members: true },
    });
  }

  async findOne(groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { members: { include: { user: true } }, cycles: true },
    });
    if (!group) throw new NotFoundException('Groupe introuvable.');
    return group;
  }

  /**
   * Aperçu public minimal par code d'invitation — écran 27. Expose
   * uniquement ce dont l'utilisateur a besoin pour décider de demander à
   * rejoindre : nom, jauge de membres (visés / déjà inscrits), montant,
   * périodicité, mode, ouverture diaspora. Jamais la liste des membres.
   */
  async previewByInviteCode(inviteCode: string) {
    const group = await this.prisma.group.findUnique({
      where: { inviteCode },
      include: { _count: { select: { members: { where: { isActive: true } } } } },
    });
    if (!group) throw new NotFoundException('Code d’invitation invalide.');

    return {
      id: group.id,
      name: group.name,
      contributionAmount: group.contributionAmount,
      periodicityDays: group.periodicityDays,
      mode: group.mode,
      openToDiaspora: group.openToDiaspora,
      memberCount: group.memberCount,
      alreadyJoined: group._count.members,
    };
  }

  /**
   * Adhésion par code d'invitation — écran 27/28. Le membre est créé en
   * statut PENDING et inactif : il devient actif (et visible dans « Mes
   * groupes », les tirages…) uniquement après validation de l'admin
   * (decideJoin).
   */
  async joinByInviteCode(userId: string, dto: JoinGroupDto) {
    const group = await this.prisma.group.findUnique({
      where: { inviteCode: dto.inviteCode },
    });
    if (!group) throw new NotFoundException('Code d’invitation invalide.');

    const existing = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId } },
    });
    if (existing) {
      if (existing.isActive) {
        throw new BadRequestException('Vous êtes déjà membre de ce groupe.');
      }
      if (existing.joinStatus === 'PENDING') {
        throw new BadRequestException('Une demande d’adhésion est déjà en attente pour ce groupe.');
      }
      // joinStatus REJECTED : autoriser une nouvelle demande.
    }

    const data = {
      groupId: group.id,
      userId,
      role: 'MEMBER' as const,
      isActive: false,
      joinStatus: 'PENDING' as const,
      joinStatusChangedAt: new Date(),
    };

    return existing
      ? this.prisma.groupMember.update({ where: { id: existing.id }, data })
      : this.prisma.groupMember.create({ data });
  }

  /**
   * Décision de l'admin sur une demande d'adhésion (écran 28 côté admin).
   */
  async decideJoin(groupId: string, adminId: string, dto: DecideJoinDto) {
    await this.assertIsAdmin(groupId, adminId);

    const member = await this.prisma.groupMember.findFirst({
      where: { id: dto.memberId, groupId },
    });
    if (!member) throw new NotFoundException('Membre introuvable dans ce groupe.');
    if (member.joinStatus !== 'PENDING') {
      throw new BadRequestException('Aucune demande d’adhésion en attente pour ce membre.');
    }

    return this.prisma.groupMember.update({
      where: { id: member.id },
      data: dto.approve
        ? { joinStatus: 'APPROVED', joinStatusChangedAt: new Date(), isActive: true }
        : { joinStatus: 'REJECTED', joinStatusChangedAt: new Date(), isActive: false },
    });
  }

  /**
   * Tirage au sort de l'ordre de rotation — écran 29. Fisher-Yates
   * rejouable tant que les cycles ne sont pas démarrés.
   */
  async drawRotation(groupId: string, requesterId: string) {
    await this.assertIsAdmin(groupId, requesterId);

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { cycles: true },
    });
    if (!group) throw new NotFoundException('Groupe introuvable.');
    if (group.rotationOrderType !== 'DRAW') {
      throw new BadRequestException('Ce groupe n’utilise pas le tirage au sort pour définir l’ordre.');
    }
    if (group.cycles.length > 0) {
      throw new BadRequestException('Impossible de tirer l’ordre : le groupe a déjà démarré ses cycles.');
    }

    const members = await this.prisma.groupMember.findMany({
      where: { groupId, isActive: true },
      orderBy: { joinedAt: 'asc' },
    });
    if (members.length < 2) {
      throw new BadRequestException('Il faut au moins 2 membres actifs pour tirer l’ordre de rotation.');
    }

    const positions = members.map((_, i) => i + 1);
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    await this.prisma.$transaction(
      members.map((member, i) =>
        this.prisma.groupMember.update({
          where: { id: member.id },
          data: { rotationPosition: positions[i] },
        }),
      ),
    );

    return this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: { isActive: true },
          orderBy: { rotationPosition: 'asc' },
          include: { user: { select: { id: true, fullName: true } } },
        },
      },
    });
  }

  /**
   * Validation de l'ordre tiré — écran 30.
   */
  async confirmRotation(groupId: string, requesterId: string) {
    await this.assertIsAdmin(groupId, requesterId);

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: { isActive: true },
          orderBy: { rotationPosition: 'asc' },
          include: { user: { select: { id: true, fullName: true } } },
        },
        cycles: true,
      },
    });
    if (!group) throw new NotFoundException('Groupe introuvable.');
    if (group.rotationOrderType !== 'DRAW') {
      throw new BadRequestException('Ce groupe n’utilise pas le tirage au sort pour définir l’ordre.');
    }
    if (group.cycles.length > 0) {
      throw new BadRequestException('L’ordre a déjà été confirmé et les cycles démarrés.');
    }
    if (group.members.some((m) => m.rotationPosition === null)) {
      throw new BadRequestException('Ordre incomplet : lancez d’abord le tirage au sort.');
    }
    return group;
  }

  /**
   * Démarrage des cycles — écran 30 « Démarrer le cycle 1 ».
   */
  async startCycles(groupId: string, requesterId: string) {
    await this.assertIsAdmin(groupId, requesterId);

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { cycles: true },
    });
    if (!group) throw new NotFoundException('Groupe introuvable.');
    if (group.cycles.length > 0) {
      throw new BadRequestException('Les cycles de ce groupe sont déjà démarrés.');
    }

    const orderedMembers = await this.prisma.groupMember.findMany({
      where: { groupId, isActive: true, rotationPosition: { not: null } },
      orderBy: { rotationPosition: 'asc' },
    });
    if (orderedMembers.length < 2) {
      throw new BadRequestException('Ordre de rotation incomplet : tirez et confirmez l’ordre avant de démarrer.');
    }

    const now = new Date();
    const msPerCycle = group.periodicityDays * 24 * 3600 * 1000;
    const expected = Number(group.contributionAmount) * orderedMembers.length;

    await this.prisma.cycle.createMany({
      data: orderedMembers.map((member, i) => ({
        groupId,
        cycleNumber: i + 1,
        beneficiaryUserId: member.userId,
        dueDate: new Date(now.getTime() + msPerCycle * (i + 1)),
        expectedAmount: expected,
      })),
    });

    await this.prisma.cycle.updateMany({
      where: { groupId, cycleNumber: 1 },
      data: { status: 'ACTIVE' },
    });

    return this.prisma.group.findUnique({
      where: { id: groupId },
      include: { cycles: { orderBy: { cycleNumber: 'asc' } } },
    });
  }

  /**
   * Statut de cotisation du cycle actif — écran 31.
   */
  async getCycleStatus(groupId: string, requesterId: string) {
    await this.assertIsMember(groupId, requesterId);

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        cycles: { where: { status: 'ACTIVE' }, take: 1 },
        members: {
          where: { isActive: true },
          include: { user: { select: { id: true, fullName: true } } },
        },
      },
    });
    if (!group) throw new NotFoundException('Groupe introuvable.');

    const cycle = group.cycles[0] ?? null;
    if (!cycle) {
      return { cycle: null, contributionAmount: group.contributionAmount, members: [] };
    }

    const contributions = await this.prisma.ledgerTransaction.findMany({
      where: {
        cycleId: cycle.id,
        type: 'CONTRIBUTION',
        status: { in: ['CONFIRMED', 'PROCESSING'] },
      },
      select: { userId: true, status: true },
    });
    const paidUserIds = new Set(
      contributions.filter((c) => c.status === 'CONFIRMED').map((c) => c.userId),
    );
    const now = new Date();

    const members = group.members.map((m) => ({
      id: m.id,
      userId: m.userId,
      fullName: m.user.fullName,
      role: m.role,
      isBeneficiary: m.userId === cycle.beneficiaryUserId,
      contributionStatus: paidUserIds.has(m.userId)
        ? ('PAID' as const)
        : cycle.dueDate < now
          ? ('LATE' as const)
          : ('PENDING' as const),
    }));

    return {
      cycle: {
        id: cycle.id,
        cycleNumber: cycle.cycleNumber,
        dueDate: cycle.dueDate,
        expectedAmount: cycle.expectedAmount,
        beneficiaryUserId: cycle.beneficiaryUserId,
      },
      contributionAmount: group.contributionAmount,
      members,
    };
  }

  /**
   * Discussion du groupe — écran 41.
   */
  async listMessages(
    groupId: string,
    requesterId: string,
    opts: { take?: number; before?: Date } = {},
  ) {
    await this.assertIsMember(groupId, requesterId);

    const take = Math.min(Math.max(opts.take ?? 100, 1), 200);

    return this.prisma.groupMessage.findMany({
      where: {
        groupId,
        ...(opts.before && !Number.isNaN(opts.before.getTime())
          ? { createdAt: { lt: opts.before } }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
      include: { user: { select: { id: true, fullName: true } } },
    });
  }

  async sendMessage(groupId: string, requesterId: string, dto: SendGroupMessageDto) {
    await this.assertIsMember(groupId, requesterId);

    const body = dto.body.trim();
    if (!body) throw new BadRequestException('Le message ne peut pas être vide.');

    return this.prisma.groupMessage.create({
      data: { groupId, userId: requesterId, body },
      include: { user: { select: { id: true, fullName: true } } },
    });
  }

  // -------------------------------------------------------------------------
  // Phase 4 — Membres & administration (écrans 42-53)
  // -------------------------------------------------------------------------

  /**
   * Écran 42 — Gestion des membres. Vue structurée : membres actifs (rôles,
   * score de fiabilité, statut de cotisation du cycle actif, jours de
   * retard), demandes d'adhésion PENDING et demandes de sortie REQUESTED.
   * Les sections demandes ne sont renvoyées qu'à l'admin.
   */
  async listMembers(groupId: string, requesterId: string) {
    const caller = await this.assertIsMember(groupId, requesterId);
    const isAdmin = caller.role === 'ADMIN';

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        cycles: { where: { status: 'ACTIVE' }, take: 1 },
        members: {
          include: { user: { select: { id: true, fullName: true, trustScore: true } } },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
    if (!group) throw new NotFoundException('Groupe introuvable.');

    const cycle = group.cycles[0] ?? null;
    const paidUserIds = new Set<string>();
    if (cycle) {
      const contributions = await this.prisma.ledgerTransaction.findMany({
        where: { cycleId: cycle.id, type: 'CONTRIBUTION', status: 'CONFIRMED' },
        select: { userId: true },
      });
      contributions.forEach((c) => paidUserIds.add(c.userId));
    }
    const now = new Date();

    const members = group.members
      .filter((m) => m.isActive)
      .map((m) => {
        const isLate = cycle && !paidUserIds.has(m.userId) && cycle.dueDate < now;
        return {
          id: m.id,
          userId: m.userId,
          fullName: m.user.fullName,
          role: m.role,
          rotationPosition: m.rotationPosition,
          trustScore: m.user.trustScore,
          isBeneficiary: cycle ? m.userId === cycle.beneficiaryUserId : false,
          contributionStatus: cycle
            ? paidUserIds.has(m.userId)
              ? ('PAID' as const)
              : isLate
                ? ('LATE' as const)
                : ('PENDING' as const)
            : null,
          daysLate: isLate
            ? Math.floor((now.getTime() - cycle.dueDate.getTime()) / 86400000)
            : 0,
          joinedAt: m.joinedAt,
          exitStatus: m.exitStatus,
        };
      });

    const pendingJoinRequests = isAdmin
      ? group.members
          .filter((m) => !m.isActive && m.joinStatus === 'PENDING')
          .map((m) => ({
            id: m.id,
            userId: m.userId,
            fullName: m.user.fullName,
            requestedAt: m.joinStatusChangedAt,
          }))
      : [];

    const exitRequests = isAdmin
      ? group.members
          .filter((m) => m.isActive && m.exitStatus === 'REQUESTED')
          .map((m) => ({ id: m.id, userId: m.userId, fullName: m.user.fullName }))
      : [];

    return {
      isAdmin,
      inviteCode: isAdmin ? group.inviteCode : null,
      memberCount: members.length,
      members,
      pendingJoinRequests,
      exitRequests,
    };
  }

  /**
   * Écran 46 — Profil d'un membre : score de fiabilité + métriques
   * calculées depuis le ledger (cotisations à temps, prêts remboursés,
   * tour reçu). Jamais de stats stockées en dur — traçabilité §6.2.
   */
  async getMemberProfile(groupId: string, requesterId: string, memberId: string) {
    await this.assertIsMember(groupId, requesterId);

    const member = await this.prisma.groupMember.findFirst({
      where: { id: memberId, groupId },
      include: { user: { select: { id: true, fullName: true, trustScore: true } } },
    });
    if (!member) throw new NotFoundException('Membre introuvable dans ce groupe.');

    const contributions = await this.prisma.ledgerTransaction.findMany({
      where: { groupId, userId: member.userId, type: 'CONTRIBUTION', status: 'CONFIRMED' },
      include: { cycle: { select: { cycleNumber: true, dueDate: true, status: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const paidOnTime = contributions.filter(
      (c) => c.cycle && c.confirmedAt && c.confirmedAt <= c.cycle.dueDate,
    ).length;
    const totalCycles = await this.prisma.cycle.count({ where: { groupId } });

    const receivedRotation = await this.prisma.cycle.findFirst({
      where: { groupId, beneficiaryUserId: member.userId, status: 'COMPLETED' },
      select: { cycleNumber: true },
    });

    const loansTotal = await this.prisma.loan.count({
      where: { groupId, borrowerId: member.userId, status: { in: ['REPAID', 'DEFAULTED'] } },
    });
    const loansRepaid = await this.prisma.loan.count({
      where: { groupId, borrowerId: member.userId, status: 'REPAID' },
    });

    return {
      id: member.id,
      userId: member.userId,
      fullName: member.user.fullName,
      trustScore: member.user.trustScore,
      role: member.role,
      joinedAt: member.joinedAt,
      rotationPosition: member.rotationPosition,
      outstandingDebt: member.outstandingDebt,
      exitStatus: member.exitStatus,
      contributionsPaid: contributions.length,
      contributionsPaidOnTime: paidOnTime,
      totalCycles,
      receivedRotation: receivedRotation?.cycleNumber ?? null,
      loansTotal,
      loansRepaid,
    };
  }

  /**
   * Écran 47 — Rappel manuel à un membre en retard : Notification
   * LATE_PAYMENT_ALERT + SMS optionnel via le SmsProvider (console en dev).
   */
  async sendContributionReminder(
    groupId: string,
    requesterId: string,
    memberId: string,
    dto: MemberReminderDto,
  ) {
    await this.assertIsAdmin(groupId, requesterId);

    const member = await this.prisma.groupMember.findFirst({
      where: { id: memberId, groupId, isActive: true },
      include: {
        group: { select: { name: true, contributionAmount: true } },
        user: { select: { id: true, fullName: true, phoneNumber: true } },
      },
    });
    if (!member) throw new NotFoundException('Membre introuvable dans ce groupe.');

    const firstName = (member.user.fullName ?? 'Membre').split(' ')[0];
    const message =
      dto.message?.trim() ||
      `Bonjour ${firstName}, ta cotisation de ${Number(
        member.group.contributionAmount,
      ).toLocaleString('fr-FR')} FCFA pour le groupe ${member.group.name} est en retard. Merci de régulariser rapidement.`;

    await this.prisma.notification.create({
      data: {
        userId: member.userId,
        type: 'LATE_PAYMENT_ALERT',
        title: 'Rappel de cotisation',
        body: message,
      },
    });

    if (dto.alsoSms && member.user.phoneNumber) {
      await this.smsService.send(member.user.phoneNumber, message);
    }

    return { sent: true, channel: dto.alsoSms ? 'NOTIFICATION+SMS' : 'NOTIFICATION' };
  }

  /**
   * Écran 45 — Retrait d'un membre PAR L'ADMIN (distinct de la sortie
   * volontaire decideExit). Le membre est désactivé — l'historique reste
   * visible (traçabilité). Garde : pas d'auto-retrait, pas de retrait
   * d'un autre admin.
   */
  async removeMember(groupId: string, adminId: string, dto: RemoveMemberDto) {
    await this.assertIsAdmin(groupId, adminId);

    const member = await this.prisma.groupMember.findFirst({
      where: { id: dto.memberId, groupId },
    });
    if (!member) throw new NotFoundException('Membre introuvable dans ce groupe.');
    if (!member.isActive) {
      throw new BadRequestException('Ce membre a déjà quitté le groupe.');
    }
    if (member.userId === adminId) {
      throw new BadRequestException(
        'Un administrateur ne peut pas se retirer lui-même : utilisez la sortie volontaire.',
      );
    }
    if (member.role === 'ADMIN') {
      throw new BadRequestException('Impossible de retirer un autre administrateur.');
    }

    return this.prisma.groupMember.update({
      where: { id: member.id },
      data: { isActive: false, exitStatus: 'APPROVED', exitDecidedAt: new Date() },
    });
  }

  /**
   * Écran 50 — Aperçu de sortie volontaire : montants calculés serveur
   * (mêmes règles que decideExit — jamais côté client).
   */
  async exitPreview(groupId: string, requesterId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: requesterId } },
    });
    if (!member || !member.isActive) {
      throw new NotFoundException('Membre introuvable dans ce groupe.');
    }

    const ownCycle = await this.prisma.cycle.findFirst({
      where: { groupId, beneficiaryUserId: requesterId },
      orderBy: { cycleNumber: 'desc' },
    });
    const rotationReceived = ownCycle?.status === 'COMPLETED';

    const contributionsPaid = await this.prisma.ledgerTransaction.aggregate({
      where: { groupId, userId: requesterId, type: 'CONTRIBUTION', status: 'CONFIRMED' },
      _sum: { amountXaf: true },
    });

    return {
      rotationReceived,
      rotationCycleNumber: ownCycle?.cycleNumber ?? null,
      contributionsPaid: contributionsPaid._sum.amountXaf ?? 0,
      outstandingDebt: member.outstandingDebt,
      amountToRefund: rotationReceived ? 0 : (contributionsPaid._sum.amountXaf ?? 0),
      amountToSettle: rotationReceived ? member.outstandingDebt : 0,
    };
  }

  /**
   * Écran 52 — Demandes de sortie en attente avec montants (admin).
   */
  async listExitRequests(groupId: string, requesterId: string) {
    await this.assertIsAdmin(groupId, requesterId);

    const members = await this.prisma.groupMember.findMany({
      where: { groupId, isActive: true, exitStatus: 'REQUESTED' },
      include: { user: { select: { id: true, fullName: true } } },
      orderBy: { exitRequestedAt: 'asc' },
    });

    const result = [];
    for (const m of members) {
      const ownCycle = await this.prisma.cycle.findFirst({
        where: { groupId, beneficiaryUserId: m.userId },
        orderBy: { cycleNumber: 'desc' },
      });
      const rotationReceived = ownCycle?.status === 'COMPLETED';

      const paid = await this.prisma.ledgerTransaction.aggregate({
        where: { groupId, userId: m.userId, type: 'CONTRIBUTION', status: 'CONFIRMED' },
        _sum: { amountXaf: true },
      });

      result.push({
        memberId: m.id,
        userId: m.userId,
        fullName: m.user.fullName,
        requestedAt: m.exitRequestedAt,
        reason: m.exitReason,
        rotationReceived,
        amountToRefund: rotationReceived ? 0 : (paid._sum.amountXaf ?? 0),
        amountToSettle: rotationReceived ? m.outstandingDebt : 0,
      });
    }
    return result;
  }

  /**
   * Désigne le caissier du groupe (Option A, §7) — écran 48.
   */
  async assignCashier(groupId: string, requesterId: string, dto: AssignCashierDto) {
    await this.assertIsAdmin(groupId, requesterId);

    const member = await this.prisma.groupMember.findFirst({
      where: { id: dto.memberId, groupId, isActive: true },
    });
    if (!member) throw new NotFoundException('Membre introuvable dans ce groupe.');

    await this.prisma.groupMember.update({
      where: { id: member.id },
      data: { role: 'CASHIER' },
    });

    return this.prisma.group.update({
      where: { id: groupId },
      data: { cashierMemberId: member.id },
      include: { cashierMember: { include: { user: true } } },
    });
  }

  /**
   * Enregistre le compte Mobile Money du caissier comme compte de dépôt —
   * écran 49. Seul le caissier peut enregistrer son propre compte.
   */
  async registerDepositAccount(groupId: string, requesterId: string, dto: RegisterDepositAccountDto) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Groupe introuvable.');
    if (!group.cashierMemberId) {
      throw new BadRequestException('Aucun caissier désigné pour ce groupe.');
    }

    const cashierMember = await this.prisma.groupMember.findUnique({
      where: { id: group.cashierMemberId },
    });
    if (!cashierMember || cashierMember.userId !== requesterId) {
      throw new ForbiddenException('Seul le caissier peut enregistrer le compte de dépôt.');
    }

    return this.prisma.group.update({
      where: { id: groupId },
      data: {
        depositAccountProvider: dto.provider,
        depositAccountPhoneNumber: dto.phoneNumber,
        depositAccountRegisteredAt: new Date(),
      },
    });
  }

  /**
   * Demande de sortie volontaire — écran 50.
   */
  async requestExit(groupId: string, userId: string, dto: RequestGroupExitDto) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member || !member.isActive) {
      throw new NotFoundException('Membre introuvable dans ce groupe.');
    }
    if (member.exitStatus === 'REQUESTED') {
      throw new BadRequestException('Une demande de sortie est déjà en attente pour ce membre.');
    }

    return this.prisma.groupMember.update({
      where: { id: member.id },
      data: { exitStatus: 'REQUESTED', exitRequestedAt: new Date(), exitReason: dto.reason },
    });
  }

  /**
   * Décision de l'admin sur une demande de sortie volontaire — écran 52.
   * Règle métier : tour non passé → remboursement des cotisations
   * (MEMBER_EXIT_SETTLEMENT au crédit) ; tour déjà reçu → règlement du
   * solde restant dû (outstandingDebt) avant sortie effective.
   */
  async decideExit(groupId: string, adminId: string, dto: DecideGroupExitDto) {
    await this.assertIsAdmin(groupId, adminId);

    const member = await this.prisma.groupMember.findFirst({
      where: { id: dto.memberId, groupId },
    });
    if (!member) throw new NotFoundException('Membre introuvable dans ce groupe.');
    if (member.exitStatus !== 'REQUESTED') {
      throw new BadRequestException('Aucune demande de sortie en attente pour ce membre.');
    }

    if (!dto.approve) {
      return this.prisma.groupMember.update({
        where: { id: member.id },
        data: { exitStatus: 'REJECTED', exitDecidedAt: new Date() },
      });
    }

    const ownCycleCompleted = await this.prisma.cycle.findFirst({
      where: { groupId, beneficiaryUserId: member.userId, status: 'COMPLETED' },
    });

    if (!ownCycleCompleted) {
      const paidSoFar = await this.prisma.ledgerTransaction.aggregate({
        where: { groupId, userId: member.userId, type: 'CONTRIBUTION', status: 'CONFIRMED' },
        _sum: { amountXaf: true },
      });
      const refundAmount = paidSoFar._sum.amountXaf ?? 0;
      if (Number(refundAmount) > 0) {
        await this.prisma.ledgerTransaction.create({
          data: {
            groupId,
            userId: member.userId,
            type: 'MEMBER_EXIT_SETTLEMENT',
            amount: refundAmount,
            currency: 'XAF',
            amountXaf: refundAmount,
            status: 'PENDING',
          },
        });
      }
    } else if (Number(member.outstandingDebt) > 0) {
      await this.prisma.ledgerTransaction.create({
        data: {
          groupId,
          userId: member.userId,
          type: 'MEMBER_EXIT_SETTLEMENT',
          amount: member.outstandingDebt,
          currency: 'XAF',
          amountXaf: member.outstandingDebt,
          status: 'PENDING',
        },
      });
    }

    return this.prisma.groupMember.update({
      where: { id: member.id },
      data: { exitStatus: 'APPROVED', exitDecidedAt: new Date(), isActive: false },
    });
  }

  async assertIsAdmin(groupId: string, userId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member || member.role !== 'ADMIN') {
      throw new ForbiddenException('Action réservée à l’administrateur du groupe.');
    }
    return member;
  }

  /** Vérifie que l'utilisateur est un membre actif du groupe. */
  private async assertIsMember(groupId: string, userId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member || !member.isActive) {
      throw new ForbiddenException('Action réservée aux membres du groupe.');
    }
    return member;
  }

  private generateInviteCode(): string {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }
}
