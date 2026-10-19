import { Injectable, NotFoundException } from '@nestjs/common';
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

  /**
   * Écran 67 — Historique de l'utilisateur, groupé par jour (maquette :
   * « Aujourd'hui », « 12 juillet »...) avec filtre Tout / Cotisations /
   * Prêts. Types exclus par filtre :
   * - Cotisations : CONTRIBUTION + EVENT_CONTRIBUTION
   * - Prêts : LOAN_DISBURSEMENT + LOAN_REPAYMENT
   */
  async historyForUser(
    userId: string,
    opts: { filter?: 'ALL' | 'CONTRIBUTIONS' | 'LOANS' } = {},
  ) {
    // Prisma exige des tableaux mutables — pas de `as const`.
    const CONTRIBUTION_TYPES: string[] = ['CONTRIBUTION', 'EVENT_CONTRIBUTION'];
    const LOAN_TYPES: string[] = ['LOAN_DISBURSEMENT', 'LOAN_REPAYMENT'];

    const where =
      opts.filter === 'CONTRIBUTIONS'
        ? { userId, type: { in: CONTRIBUTION_TYPES } }
        : opts.filter === 'LOANS'
          ? { userId, type: { in: LOAN_TYPES } }
          : { userId };

    const transactions = await this.prisma.ledgerTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        group: { select: { id: true, name: true } },
        cycle: { select: { cycleNumber: true } },
      },
    });

    // Groupement par jour (clé ISO locale).
    const days: { date: string; items: unknown[] }[] = [];
    const byDay = new Map<string, unknown[]>();
    for (const tx of transactions) {
      const key = new Date(tx.createdAt).toISOString().slice(0, 10);
      if (!byDay.has(key)) {
        byDay.set(key, []);
        days.push({ date: key, items: byDay.get(key)! });
      }
      byDay.get(key)!.push(this.serializeTransaction(tx));
    }
    return days;
  }

  /**
   * Écran 68 — Détail d'une transaction : montant signé (+ crédit / − débit),
   * type, statut, date, moyen de paiement, référence opérateur, groupe et
   * cycle éventuel. Vue sécurisée : l'utilisateur ne voit que ses propres
   * transactions.
   */
  async findOneForUser(id: string, userId: string) {
    const tx = await this.prisma.ledgerTransaction.findFirst({
      where: { id, userId },
      include: {
        group: { select: { id: true, name: true } },
        cycle: { select: { cycleNumber: true } },
      },
    });
    if (!tx) throw new NotFoundException('Transaction introuvable.');
    return this.serializeTransaction(tx);
  }

  async findOne(id: string) {
    return this.prisma.ledgerTransaction.findUnique({ where: { id } });
  }

  private serializeTransaction(tx: {
    id: string;
    groupId: string | null;
    cycleId: string | null;
    type: string;
    status: string;
    amount: { toString(): string };
    currency: string;
    externalReference: string | null;
    provider: string | null;
    createdAt: Date;
    confirmedAt: Date | null;
    group?: { id: string; name: string } | null;
    cycle?: { cycleNumber: number } | null;
  }) {
    // Sens de l'opération pour l'utilisateur courant — écran 67/68 :
    // cotisations et remboursements sont des débits (−), les versements de
    // tour et décaissements de prêt sont des crédits (+).
    const CREDIT_TYPES = [
      'ROTATION_PAYOUT',
      'LOAN_DISBURSEMENT',
      'MEMBER_EXIT_SETTLEMENT',
      'EVENT_PAYOUT',
    ];
    const isCredit = CREDIT_TYPES.includes(tx.type);
    return {
      id: tx.id,
      groupId: tx.groupId,
      groupName: tx.group?.name ?? null,
      cycleId: tx.cycleId,
      cycleNumber: tx.cycle?.cycleNumber ?? null,
      type: tx.type,
      status: tx.status,
      amount: tx.amount.toString(),
      currency: tx.currency,
      isCredit,
      externalReference: tx.externalReference,
      provider: tx.provider,
      createdAt: tx.createdAt,
      confirmedAt: tx.confirmedAt,
    };
  }
}
