import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
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

  async joinByInviteCode(userId: string, dto: JoinGroupDto) {
    const group = await this.prisma.group.findUnique({
      where: { inviteCode: dto.inviteCode },
    });
    if (!group) throw new NotFoundException('Code d’invitation invalide.');

    // MVP : adhésion directe. Une validation admin pourra être ajoutée
    // (cf. écran "JOIN REQUEST PENDING" de la maquette) via un statut
    // GroupMember distinct si le groupe l'exige.
    return this.prisma.groupMember.create({
      data: { groupId: group.id, userId, role: 'MEMBER' },
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
   *   qu'il doit encore au groupe (`outstandingDebt`, alimenté par les
   *   cotisations restantes dues) doit être réglé avant la sortie
   *   effective (transaction MEMBER_EXIT_SETTLEMENT au débit du membre).
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
      // Tour pas encore passé : remboursement des cotisations déjà versées.
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
      // Tour déjà passé : le solde dû doit être réglé par le membre.
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
