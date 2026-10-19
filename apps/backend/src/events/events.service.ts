import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { ContributeEventDto } from './dto/contribute-event.dto';

/**
 * Cagnottes évènementielles (deuil, anniversaire, naissance, mariage,
 * maladie...) — distinctes du cycle rotatif. Chaque membre du groupe cotise
 * librement pour le bénéficiaire de l'évènement ; comme pour les cotisations
 * de cycle, les fonds transitent vers le compte de dépôt du caissier qui
 * reverse ensuite au bénéficiaire (Option A, cf. cahier des charges §7).
 *
 * Design traçabilité : la ligne EventContribution est créée/lidée dès la
 * PRÉPARATION du paiement (prepareContribution, module payments) avec son
 * transactionId. Elle ne compte comme « collectée » qu'une fois la
 * transaction CONFIRMED par le webhook agrégateur — les lectures filtrent
 * sur transaction.status (cf. findForGroup/findOne). Une transaction FAILED
 * laisse la ligne remplaçable au prochain essai (upsert).
 */
@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateEventDto) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: dto.groupId, userId } },
    });
    if (!membership || !membership.isActive) {
      throw new ForbiddenException('Vous n’êtes pas membre de ce groupe.');
    }

    const beneficiary = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: dto.groupId, userId: dto.beneficiaryUserId } },
    });
    if (!beneficiary) {
      throw new BadRequestException('Le bénéficiaire doit être membre du groupe.');
    }

    return this.prisma.groupEvent.create({
      data: {
        groupId: dto.groupId,
        type: dto.type,
        customLabel: dto.customLabel,
        beneficiaryUserId: dto.beneficiaryUserId,
        description: dto.description,
        suggestedAmount: dto.suggestedAmount,
        createdById: userId,
      },
      include: { beneficiary: true },
    });
  }

  /**
   * Écran 54 — évènements du groupe : pour chaque cagnotte, total collecté,
   * contributeurs, membres restants (actifs n'ayant pas encore cotisé).
   * Les OPEN en tête, les CLOSED en dessous (maquette 54).
   */
  async findForGroup(groupId: string) {
    const events = await this.prisma.groupEvent.findMany({
      where: { groupId },
      include: {
        beneficiary: { select: { id: true, fullName: true } },
        createdBy: { select: { id: true, fullName: true } },
        contributions: {
          where: { transaction: { status: 'CONFIRMED' } },
          include: { user: { select: { id: true, fullName: true } } },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    const activeMembers = await this.prisma.groupMember.count({
      where: { groupId, isActive: true },
    });

    return {
      activeMembers,
      events: events.map((e) => ({
        id: e.id,
        type: e.type,
        customLabel: e.customLabel,
        description: e.description,
        suggestedAmount: e.suggestedAmount,
        status: e.status,
        createdAt: e.createdAt,
        closedAt: e.closedAt,
        beneficiary: e.beneficiary,
        createdBy: e.createdBy,
        collectedAmount: e.contributions.reduce((sum, c) => sum + Number(c.amount), 0),
        contributorsCount: e.contributions.length,
        remainingMembers: Math.max(activeMembers - e.contributions.length, 0),
        contributions: e.contributions.map((c) => ({
          userId: c.userId,
          fullName: c.user.fullName,
          amount: c.amount,
        })),
      })),
    };
  }

  /**
   * Écran 56 — détail d'une cagnotte : collecté, contributeurs (montants)
   * et membres en attente (actifs du groupe n'ayant pas encore cotisé).
   */
  async findOne(eventId: string) {
    const event = await this.prisma.groupEvent.findUnique({
      where: { id: eventId },
      include: {
        beneficiary: { select: { id: true, fullName: true } },
        createdBy: { select: { id: true, fullName: true } },
        contributions: {
          where: { transaction: { status: 'CONFIRMED' } },
          include: { user: { select: { id: true, fullName: true } } },
        },
      },
    });
    if (!event) throw new NotFoundException('Évènement introuvable.');

    const activeMembers = await this.prisma.groupMember.findMany({
      where: { groupId: event.groupId, isActive: true },
      include: { user: { select: { id: true, fullName: true } } },
      orderBy: { joinedAt: 'asc' },
    });
    const contributorsUserIds = new Set(event.contributions.map((c) => c.userId));

    return {
      id: event.id,
      groupId: event.groupId,
      type: event.type,
      customLabel: event.customLabel,
      description: event.description,
      suggestedAmount: event.suggestedAmount,
      status: event.status,
      createdAt: event.createdAt,
      closedAt: event.closedAt,
      beneficiary: event.beneficiary,
      createdBy: event.createdBy,
      collectedAmount: event.contributions.reduce((sum, c) => sum + Number(c.amount), 0),
      contributions: event.contributions.map((c) => ({
        userId: c.userId,
        fullName: c.user.fullName,
        amount: c.amount,
      })),
      waitingMembers: activeMembers
        .filter((m) => !contributorsUserIds.has(m.userId))
        .map((m) => ({ userId: m.userId, fullName: m.user.fullName })),
    };
  }

  /**
   * Écran 56 — déclarer sa cotisation à l'évènement SANS paiement immédiat
   * (montant libre, écrase une précédente tentative non confirmée). Le flux
   * nominal passe par POST /payments/prepare avec eventId (module
   * payments), qui crée la transaction PENDING + la ligne EventContribution
   * liée ; ce endpoint reste utile pour ajuster un montant déclaré avant
   * de payer. Jamais de ligne comptabilisée avant confirmation webhook.
   */
  async contribute(eventId: string, userId: string, dto: ContributeEventDto) {
    const event = await this.prisma.groupEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Évènement introuvable.');
    if (event.status !== 'OPEN') {
      throw new BadRequestException('Cet évènement n’accepte plus de cotisations.');
    }

    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: event.groupId, userId } },
    });
    if (!membership || !membership.isActive) {
      throw new ForbiddenException('Vous n’êtes pas membre de ce groupe.');
    }

    // Un montant déjà CONFIRMED ne peut pas être écrasé (append-only).
    const confirmed = await this.prisma.eventContribution.findFirst({
      where: { eventId, userId, transaction: { status: 'CONFIRMED' } },
    });
    if (confirmed) {
      throw new BadRequestException('Votre cotisation à cet évènement est déjà confirmée.');
    }

    return this.prisma.eventContribution.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId, amount: dto.amount },
      update: { amount: dto.amount },
    });
  }

  async close(eventId: string, requesterId: string) {
    const event = await this.prisma.groupEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Évènement introuvable.');
    if (event.beneficiaryUserId !== requesterId && event.createdById !== requesterId) {
      throw new ForbiddenException('Seul le bénéficiaire ou l’auteur peut clôturer l’évènement.');
    }

    return this.prisma.groupEvent.update({
      where: { id: eventId },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
  }

  /**
   * Confirmation interne appelée après le webhook agrégateur
   * (POST /events/confirm-contribution). La cotisation ne compte comme
   * « collectée » qu'une fois sa transaction CONFIRMED — les lectures
   * filtrent sur le statut, donc ce endpoint vérifie la transaction et
   * renvoie l'état courant de la cotisation.
   */
  async confirmEventContribution(transactionId: string) {
    const tx = await this.prisma.ledgerTransaction.findUnique({
      where: { id: transactionId },
    });
    if (!tx) throw new NotFoundException('Transaction introuvable.');

    const contribution = await this.prisma.eventContribution.findFirst({
      where: { transactionId },
    });
    if (!contribution) {
      throw new NotFoundException('Aucune cotisation rattachée à cette transaction.');
    }

    return {
      eventId: contribution.eventId,
      userId: contribution.userId,
      amount: contribution.amount,
      confirmed: tx.status === 'CONFIRMED',
    };
  }
}
