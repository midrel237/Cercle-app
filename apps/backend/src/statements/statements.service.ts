import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { buildStatementPdf, type PdfLine } from './pdf-generator';

/**
 * Relevé PDF d'un groupe (écran 69) : transactions CONFIRMED du ledger
 * groupées par membre, avec totaux. Généré à la demande — aucun stockage :
 * le PDF est servi immédiatement en réponse HTTP.
 *
 * Sécurité : le demandeur doit être membre du groupe (même garde que
 * GET /groups/:id — un relevé expose les flux financiers du groupe).
 */
@Injectable()
export class StatementsService {
  constructor(private readonly prisma: PrismaService) {}

  async buildGroupStatementPdf(groupId: string, requesterId: string): Promise<Buffer> {
    // Garde : membre du groupe uniquement.
    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: requesterId } },
    });
    if (!membership) throw new NotFoundException('Groupe introuvable.');

    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Groupe introuvable.');

    // Transactions CONFIRMED du groupe, chronologiques (relevé).
    const transactions = await this.prisma.ledgerTransaction.findMany({
      where: { groupId, status: 'CONFIRMED' },
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const fmtDate = (d: Date) =>
      d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const fmtAmount = (n: unknown) => Number(n).toLocaleString('fr-FR');

    const lines: PdfLine[] = [];
    lines.push({ text: 'Cercle', size: 18, bold: true });
    lines.push({ text: `Releve du groupe - ${group.name}`, size: 13, bold: true, dy: 6 });
    lines.push({
      text: `Genere le ${new Date().toLocaleDateString('fr-FR')} - ${transactions.length} transaction(s) confirmee(s)`,
      size: 9,
      dy: 4,
    });
    lines.push({ text: '', dy: 8 });

    // En-têtes de colonnes.
    lines.push({
      text: 'Date        Membre                       Type                        Montant (XAF)',
      size: 9,
      bold: true,
    });
    lines.push({ text: '', dy: 4 });

    const TYPE_LABEL: Record<string, string> = {
      CONTRIBUTION: 'Cotisation',
      EVENT_CONTRIBUTION: 'Cagnotte',
      ROTATION_PAYOUT: 'Versement tour',
      LOAN_DISBURSEMENT: 'Pret accorde',
      LOAN_REPAYMENT: 'Remboursement',
      MEMBER_EXIT_SETTLEMENT: 'Reglement sortie',
      EVENT_PAYOUT: 'Versement cagnotte',
    };

    let totalCollected = 0;
    let totalPaidOut = 0;
    for (const tx of transactions) {
      const name = (tx.user.fullName ?? 'Sans nom').slice(0, 24).padEnd(24);
      const type = (TYPE_LABEL[tx.type] ?? tx.type).slice(0, 24).padEnd(24);
      const amount = fmtAmount(tx.amountXaf);
      lines.push({
        text: `${fmtDate(tx.createdAt)}  ${name}${type}${amount}`,
        size: 9,
      });
      if (tx.type === 'ROTATION_PAYOUT' || tx.type === 'EVENT_PAYOUT') {
        totalPaidOut += Number(tx.amountXaf);
      } else {
        totalCollected += Number(tx.amountXaf);
      }
    }

    lines.push({ text: '', dy: 6 });
    lines.push({
      text: `Total collecte : ${fmtAmount(totalCollected)} XAF`,
      size: 10,
      bold: true,
    });
    lines.push({
      text: `Total verse (tours + cagnottes) : ${fmtAmount(totalPaidOut)} XAF`,
      size: 10,
    });
    lines.push({
      text: `Solde du pot sur la periode : ${fmtAmount(totalCollected - totalPaidOut)} XAF`,
      size: 10,
      bold: true,
      dy: 4,
    });

    return buildStatementPdf(lines);
  }
}
