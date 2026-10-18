import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';
import { LoansService } from '../loans/loans.service';
import { AddPaymentMethodDto } from './dto/add-payment-method.dto';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PrepareContributionDto } from './dto/prepare-contribution.dto';
import { MobileMoneyAggregator } from './mobile-money-aggregator.interface';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject('MOBILE_MONEY_AGGREGATOR') private readonly aggregator: MobileMoneyAggregator,
    private readonly transactionsService: TransactionsService,
    private readonly loansService: LoansService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Écran "Ajouter un moyen de paiement" (35). BANK_CARD / BANK_TRANSFER ne
   * sont acceptés que si l'utilisateur appartient à au moins un groupe
   * `openToDiaspora = true` — validé ici avant persistance.
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
   * Garde-fous : membre actif du groupe uniquement ; montant du cycle
   * repris du groupe (jamais envoyé par le client) ; anti-doublon.
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

    // Cas cagnotte d'évènement (Phase 5, écran 56) : même ledger, autre
    // type. Montant libre (la maquette montre des montants différents par
    // contributeur : 5 000 / 2 000...) — plafonné à un minimum de 100 XAF
    // pour éviter les cotisations nulles ; suggestion = suggestedAmount.
    if (dto.eventId) {
      const event = await this.prisma.groupEvent.findFirst({
        where: { id: dto.eventId, groupId: dto.groupId, status: 'OPEN' },
      });
      if (!event) throw new NotFoundException('Évènement introuvable ou clôturé.');

      const confirmedContribution = await this.prisma.eventContribution.findFirst({
        where: { eventId: dto.eventId, userId, transaction: { status: 'CONFIRMED' } },
      });
      if (confirmedContribution) {
        throw new BadRequestException('Votre cotisation à cet évènement est déjà versée.');
      }

      const suggested = Number(event.suggestedAmount ?? group.contributionAmount);
      const amount = dto.amount !== undefined ? Math.max(Number(dto.amount), 100) : suggested;

      const transaction = await this.transactionsService.createPending(userId, {
        groupId: dto.groupId,
        type: 'EVENT_CONTRIBUTION',
        amount,
        provider,
      });

      // Trace la ligne EventContribution liée à la transaction dès la
      // préparation : elle ne comptera comme « collectée » qu'une fois la
      // transaction CONFIRMED (filtre des lectures, cf. EventsService). Un
      // échec de paiement laisse la ligne remplaçable (transactionId
      // unique + upsert eventId/userId) au prochain essai.
      await this.prisma.eventContribution.upsert({
        where: { eventId_userId: { eventId: event.id, userId } },
        create: { eventId: event.id, userId, amount, transactionId: transaction.id },
        update: { amount, transactionId: transaction.id },
      });

      return transaction;
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

  /**
   * Webhook de l'agrégateur Mobile Money. À la confirmation, selon le type
   * de la transaction : cotisation/évènement → ledger uniquement ;
   * LOAN_REPAYMENT → marque en plus l'échéance correspondante PAID (et le
   * prêt REPAID à la dernière échéance, cf. LoansService.confirmRepayment).
   */
  async handleWebhook(rawBody: string, signature: string, payload: {
    transactionId: string;
    externalReference: string;
    status: 'confirmed' | 'failed';
  }) {
    if (!this.aggregator.verifyWebhookSignature(rawBody, signature)) {
      throw new Error('Signature de webhook invalide.');
    }
    if (payload.status === 'confirmed') {
      const confirmed = await this.transactionsService.confirm(
        payload.transactionId,
        payload.externalReference,
      );
      if (confirmed?.type === 'LOAN_REPAYMENT') {
        await this.loansService.confirmRepayment(payload.transactionId);
      }
      return confirmed;
    }
    return this.transactionsService.markFailed(payload.transactionId);
  }
}
