import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';
import { AddPaymentMethodDto } from './dto/add-payment-method.dto';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
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
    return this.prisma.paymentMethod.findMany({ where: { userId } });
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
