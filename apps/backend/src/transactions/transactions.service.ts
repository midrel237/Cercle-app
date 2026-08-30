import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

/**
 * Le ledger est APPEND-ONLY : on ne modifie jamais une ligne existante pour
 * changer un montant ou un type, seulement son statut (pending -> confirmed
 * / failed) suite à la confirmation Mobile Money. Voir cahier des charges §6.2.
 */
@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPending(userId: string, dto: CreateTransactionDto) {
    // Devise pivot XAF par défaut (paiement local). Pour une cotisation
    // diaspora (currency != XAF), amountXaf/fxRate doivent être fournis par
    // l'appelant (conversion figée au moment de la transaction, cf. §6.2).
    const currency = dto.currency ?? 'XAF';
    const amountXaf = dto.amountXaf ?? (currency === 'XAF' ? dto.amount : undefined);
    if (amountXaf === undefined) {
      throw new Error('amountXaf est requis pour une transaction dans une devise étrangère.');
    }
    return this.prisma.ledgerTransaction.create({
      data: { ...dto, currency, amountXaf, userId, status: 'PENDING' },
    });
  }

  async confirm(transactionId: string, externalReference: string) {
    return this.prisma.ledgerTransaction.update({
      where: { id: transactionId },
      data: { status: 'CONFIRMED', externalReference, confirmedAt: new Date() },
    });
  }

  async markFailed(transactionId: string) {
    return this.prisma.ledgerTransaction.update({
      where: { id: transactionId },
      data: { status: 'FAILED' },
    });
  }

  async historyForGroup(groupId: string) {
    return this.prisma.ledgerTransaction.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
  }

  async historyForUser(userId: string) {
    return this.prisma.ledgerTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.ledgerTransaction.findUnique({ where: { id } });
  }
}
