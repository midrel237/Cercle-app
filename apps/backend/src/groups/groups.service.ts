import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { DecideJoinDto } from './dto/decide-join.dto';
import { AssignCashierDto } from './dto/assign-cashier.dto';
import { RegisterDepositAccountDto } from './dto/register-deposit-account.dto';
import { RequestGroupExitDto } from './dto/request-exit.dto';
import { DecideGroupExitDto } from './dto/decide-exit.dto';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

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
   * (decideJoin). Remplace l'adhésion directe du MVP initial, conformément
   * à la maquette « JOIN REQUEST PENDING ».
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
   * Approve → membre activé (joinStatus APPROVED, isActive true). Sinon →
   * REJECTED, le membre reste inactif et peut redemander plus tard.
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
   * Tirage au sort de l'ordre de rotation — écran 29. Admin uniquement,
   * uniquement en mode DRAW, uniquement avant tout cycle démarré. Attribue
   * rotationPosition 1..N par un mélange de Fisher-Yates ; rejouable tant
   * que l'ordre n'est pas confirmé (via le démarrage des cycles).
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

    // Fisher-Yates : chaque permutation a une probabilité identique.
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
   * Validation de l'ordre tiré — écran 30. Une fois les cycles démarrés
   * (startCycles), l'ordre est verrouillé (drawRotation refuse si des
   * cycles existent). Ici on valide la complétude de l'ordre avant le
   * démarrage.
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
   * Démarrage des cycles — écran 30 « Démarrer le cycle 1 ». Crée les N
   * cycles (cycleNumber 1..N) à partir de l'ordre confirmé : chaque cycle
   * a pour bénéficiaire le membre à la position correspondante, et une
   * date d'échéance échelonnée selon la périodicité du groupe.
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

    // Cycle 1 actif dès le démarrage.
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
   * Désigne le caissier du groupe (Option A, §7). Le caissier reste un
   * membre cotisant à part entière — sa désignation ne change que sa
   * responsabilité de collecte/reversement, pas sa participation au cycle.
   * Réservé à l'administrateur du groupe.
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
   * Enregistre le compte Mobile Money du caissier comme compte de dépôt du
   * groupe : c'est là que les membres versent leur cotisation avant que le
   * caissier ne reverse au bénéficiaire. Seul le caissier peut enregistrer
   * son propre compte.
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
   * Demande de sortie volontaire d'un membre (distinct d'une exclusion par
   * l'admin). Toujours soumise à validation — cf. decideExit pour la règle
   * de remboursement/dette appliquée selon que le tour du membre est déjà
   * passé ou non.
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
   * Décision de l'admin sur une demande de sortie volontaire.
   *
   * Règle métier (cf. cadrage du projet) :
   * - Si le tour de rotation du membre n'est pas encore passé : ses
   *   cotisations déjà versées et confirmées lui sont remboursées
   *   (transaction MEMBER_EXIT_SETTLEMENT au crédit du membre).
   * - Si son tour est déjà passé (il a reçu sa cagnotte) : le solde
   *   qu'il doit encore au groupe (`outstandingDebt`) doit être réglé
   *   avant la sortie effective.
   *
   * Les transactions créées ici sont en statut PENDING : leur exécution
   * réelle (versement/prélèvement Mobile Money) reste à brancher sur
   * l'agrégateur, comme le reste du module payments.
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

  private generateInviteCode(): string {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }
}
