import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';
import { AddPaymentMethodDto } from './dto/add-payment-method.dto';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PrepareContributionDto } from './dto/prepare-contribution.dto';
import { MobileMoneyAggregator } from './mobile-money-aggregator.interface';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject('MOBILE_MONEY_AGGREGATOR') private readonly aggregator: MobileMoneyAggregator,
    private readonly transactionsService: TransactionsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Écran "Ajouter un moyen de paiement" (35). BANK_CARD / BANK_TRANSFER ne
   * sont acceptés que si l'utilisateur appartient à au moins un groupe
   * `openToDiaspora = true` — à valider ici avant persistance (TODO :
   * brancher le contrôle réel une fois la logique d'appartenance groupe
   * disponible côté service).
   */
  async addPaymentMethod(userId: string, dto: AddPaymentMethodDto) {
    if (dto.type === 'BANK_CARD' || dto.type === 'BANK_TRANSFER') {
      const diasporaGroups = await this.prisma.group.findFirst({
        where: {
          openToDiaspora: true,
          members: { some: { userId, isActive: true } },
        },
      });
      if (!diasporaGroups) {
        throw new ForbiddenException(
          'Les moyens de paiement bancaires sont réservés aux membres de groupes ouverts à la diaspora.',
        );
      }
    }

    if (dto.isDefault) {
      await this.prisma.paymentMethod.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    return this.prisma.paymentMethod.create({
      data: {
        userId,
        type: dto.type,
        provider: dto.provider,
        phoneNumber: dto.phoneNumber,
        cardToken: dto.cardToken,
        cardBrand: dto.cardBrand,
        cardLast4: dto.cardLast4,
        bankName: dto.bankName,
        bankCountry: dto.bankCountry,
        ibanLast4: dto.ibanLast4,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async listPaymentMethods(userId: string) {
    return this.prisma.paymentMethod.findMany({
      where: { userId },
      orderBy: { isDefault: 'desc' },
    });
  }

  /**
   * Préparation de la cotisation — écrans 31→32. Crée la transaction
   * PENDING dans le ledger, rattachée au cycle actif du groupe (via
   * cycleId, ajouté en Phase 2) : c'est ce rattachement qui alimente
   * GET /groups/:id/cycle-status (Payé / En attente / En retard) dès que
   * le webhook confirme. Si eventId est fourni, la cotisation est versée
   * pour une cagnotte d'évènement au lieu du cycle (écran 56, Phase 5).
   *
   * Garde-fous : membre actif du groupe uniquement ; montant repris du
   * groupe (jamais envoyé par le client — pas de falsification possible) ;
   * pas de doublon : refuse si une cotisation CONFIRMED existe déjà pour
   * ce membre/cycle (le bouton de l'écran 31 se désactive en amont, mais
   * le backend reste la barrière).
   */
  async prepareContribution(userId: string, dto: PrepareContributionDto) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: dto.groupId, userId } },
    });
    if (!member || !member.isActive) {
      throw new ForbiddenException('Action réservée aux membres actifs du groupe.');
    }

    const group = await this.prisma.group.findUnique({
      where: { id: dto.groupId },
      include: { cycles: { where: { status: 'ACTIVE' }, take: 1 } },
    });
    if (!group) throw new NotFoundException('Groupe introuvable.');

    const provider = dto.provider ?? 'MTN_MOMO';

    // Cas cagnotte d'évènement (Phase 5) : même ledger, autre type.
    if (dto.eventId) {
      const event = await this.prisma.groupEvent.findFirst({
        where: { id: dto.eventId, groupId: dto.groupId, status: 'OPEN' },
      });
      if (!event) throw new NotFoundException('Évènement introuvable ou clôturé.');

      const existingEvent = await this.prisma.ledgerTransaction.findFirst({
        where: {
          groupId: dto.groupId,
          userId,
          type: 'EVENT_CONTRIBUTION',
          status: { in: ['PENDING', 'CONFIRMED'] },
          eventContribution: { eventId: dto.eventId },
        },
      });
      if (existingEvent) {
        throw new BadRequestException('Une cotisation à cet évènement est déjà en cours ou versée.');
      }

      const amount = event.suggestedAmount ?? group.contributionAmount;
      return this.transactionsService.createPending(userId, {
        groupId: dto.groupId,
        type: 'EVENT_CONTRIBUTION',
        amount: Number(amount),
        provider,
      });
    }

    // Cas nominal : cotisation au cycle actif.
    const cycle = group.cycles[0];
    if (!cycle) {
      throw new BadRequestException('Aucun cycle actif : la cotisation ne peut pas être préparée.');
    }

    const existing = await this.prisma.ledgerTransaction.findFirst({
      where: {
        groupId: dto.groupId,
        userId,
        cycleId: cycle.id,
        type: 'CONTRIBUTION',
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });
    if (existing) {
      throw new BadRequestException('Votre cotisation pour ce cycle est déjà en cours ou payée.');
    }

    const transaction = await this.transactionsService.createPending(userId, {
      groupId: dto.groupId,
      type: 'CONTRIBUTION',
      amount: Number(group.contributionAmount),
      provider,
    });

    // Rattachement au cycle actif — alimente le statut Payé dès le webhook
    // de confirmation (cf. getCycleStatus, Phase 2).
    return this.prisma.ledgerTransaction.update({
      where: { id: (transaction as { id: string }).id },
      data: { cycleId: cycle.id },
    });
  }

  async initiate(userPhoneNumber: string, dto: InitiatePaymentDto) {
    const result = await this.aggregator.initiateCharge({
      provider: dto.provider,
      phoneNumber: userPhoneNumber,
      amount: dto.amount,
      reference: dto.transactionId,
    });
    return result;
  }

  /** Endpoint appelé par l'agrégateur Mobile Money (webhook de confirmation). */
  async handleWebhook(rawBody: string, signature: string, payload: {
    transactionId: string;
    externalReference: string;
    status: 'confirmed' | 'failed';
  }) {
    if (!this.aggregator.verifyWebhookSignature(rawBody, signature)) {
      throw new Error('Signature de webhook invalide.');
    }
    if (payload.status === 'confirmed') {
      return this.transactionsService.confirm(payload.transactionId, payload.externalReference);
    }
    return this.transactionsService.markFailed(payload.transactionId);
  }
}
