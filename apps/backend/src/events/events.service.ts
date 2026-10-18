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
   * Écran 54 — évènements du groupe, avec pour chaque cagnotte le total
   * collecté, le nombre de contributeurs et le nombre de membres restants
   * (membres actifs du groupe n'ayant pas encore cotisé). Les évènements
   * OPEN sont listés en tête, les CLOSED en dessous (maquette 54).
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
   * Enregistre la cotisation d'un membre à l'évènement (écran 56).
   * Le montant et le paiement Mobile Money sont orchestrés par le module
   * payments via prepareContribution({eventId}) : une transaction PENDING
   * de type EVENT_CONTRIBUTION est créée dans le ledger, puis le webhook
   * de l'agrégateur appelle confirmEventContribution ci-dessous pour
   * tracer la ligne EventContribution — jamais avant la confirmation.
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

    // L'upsert est intentionnel : un membre peut ajuster son montant tant
    // que la transaction n'est pas confirmée (statut PENDING → remplaçable).
    return this.prisma.eventContribution.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId, amount: dto.amount },
      update: { amount: dto.amount },
    });
  }

  /**
   * Appelé par le webhook de paiement (PaymentsService.handleWebhook) quand
   * une transaction de type EVENT_CONTRIBUTION est CONFIRMED : trace/lie
   * la ligne EventContribution correspondante. Idempotent : si la
   * contribution existe déjà (réception de webhook dupliquée), elle est
   * simplement liée à la transaction.
   */
  async confirmEventContribution(transactionId: string) {
    const transaction = await this.prisma.ledgerTransaction.findUnique({
      where: { id: transactionId },
    });
    if (!transaction) throw new NotFoundException('Transaction introuvable.');
    if (transaction.type !== 'EVENT_CONTRIBUTION') {
      throw new BadRequestException('Cette transaction n’est pas une cotisation d’évènement.');
    }

    // L'eventId est stocké via la relation eventContribution de la
    // transaction (prepareContribution, Phase 3). On la retrouve par l'user
    // concerné : une seule contribution active par (event, user).
    const existing = await this.prisma.eventContribution.findFirst({
      where: { userId: transaction.userId, transactionId: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!existing) {
      // Contribution absente (préparation directe sans contribute appelé
      // avant) : impossible de connaître l'eventId — l'API ne stocke pas
      // eventId sur LedgerTransaction. On ignore silencieusement ; la
      // contribution reste tracée par le ledger lui-même.
      return null;
    }

    return this.prisma.eventContribution.update({
      where: { id: existing.id },
      data: { amount: transaction.amount, transactionId: transaction.id },
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
}
