import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../database/prisma.service';

/**
 * Palette Cercle — miroir de apps/mobile/src/theme/colors.ts, pour un PDF
 * fidèle à l'identité visuelle de l'app (écran 69 : relevé du groupe).
 */
const CERCLE = {
  navyDark: '#1B2340',
  gold: '#E8C989',
  goldDark: '#C9962C',
  goldText: '#8A6A00',
  cream: '#FBF3E2',
  inkSoft: '#6B6F80',
  sand: '#E7E1D4',
  success: '#2F8F5B',
  danger: '#C15B3D',
} as const;

/** Libellés FR des types de transaction (alignés sur l'écran 69). */
const TYPE_LABEL: Record<string, string> = {
  CONTRIBUTION: 'Cotisation',
  EVENT_CONTRIBUTION: 'Cagnotte',
  ROTATION_PAYOUT: 'Versement rotation',
  LOAN_DISBURSEMENT: 'Prêt accordé',
  LOAN_REPAYMENT: 'Remboursement',
  MEMBER_EXIT_SETTLEMENT: 'Règlement sortie',
  EVENT_PAYOUT: 'Versement cagnotte',
};

interface StatementRow {
  id: string;
  type: string;
  status: string;
  amount: { toString(): string };
  createdAt: Date;
  user?: { fullName: string | null } | null;
}

/**
 * Écran 69 — Relevé PDF d'un groupe. Génère le document côté serveur
 * (pdfkit, flux mémoire) : les données restent côté backend, aucun
 * service tiers. Le ledger étant append-only, le relevé liste les
 * transactions dans l'ordre chronologique inverse, avec le total signé
 * (+ crédit / − débit) — même lecture de sens que serializeTransaction
 * (transactions.service.ts).
 */
@Injectable()
export class StatementsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Génère le PDF du relevé du groupe et renvoie le buffer. */
  async generateGroupStatement(groupId: string): Promise<Buffer> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, name: true },
    });
    if (!group) throw new NotFoundException('Groupe introuvable.');

    const transactions = await this.prisma.ledgerTransaction.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { fullName: true } } },
    });

    return this.renderPdf(group.name, transactions);
  }

  private renderPdf(groupName: string, rows: StatementRow[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: { Title: `Cercle — Relevé ${groupName}` },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ---- En-tête — bandeau marine, marque or (maquette écran 69). ----
      doc.rect(0, 0, doc.page.width, 90).fill(CERCLE.navyDark);
      doc
        .fillColor(CERCLE.gold)
        .font('Helvetica-Bold')
        .fontSize(22)
        .text('Cercle', 50, 28);
      doc
        .fillColor(CERCLE.cream)
        .font('Helvetica')
        .fontSize(10)
        .text(`Relevé — ${groupName.toUpperCase()}`, 50, 56);
      doc
        .fillColor(CERCLE.gold)
        .font('Helvetica')
        .fontSize(9)
        .text(
          `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
          50,
          72,
          { align: 'right', width: doc.page.width - 100 },
        );

      // ---- Lignes de transactions. ----
      let y = 130;
      const colDate = 50;
      const colType = 150;
      const colMember = 300;
      const colAmount = doc.page.width - 170;
      const colStatus = doc.page.width - 100;

      // En-tête de tableau.
      doc
        .fillColor(CERCLE.goldText)
        .font('Helvetica-Bold')
        .fontSize(8)
        .text('DATE', colDate, y)
        .text('OPÉRATION', colType, y)
        .text('MEMBRE', colMember, y)
        .text('MONTANT', colAmount, y, { align: 'right' })
        .text('STATUT', colStatus, y, { align: 'right' });
      y += 16;
      doc
        .moveTo(50, y)
        .lineTo(doc.page.width - 50, y)
        .lineWidth(1)
        .strokeColor(CERCLE.sand)
        .stroke();
      y += 14;

      // Corps — sens identique à l'écran 69 (alignement serializeTransaction).
      const CREDIT_TYPES = [
        'ROTATION_PAYOUT',
        'LOAN_DISBURSEMENT',
        'MEMBER_EXIT_SETTLEMENT',
        'EVENT_PAYOUT',
      ];

      doc.font('Helvetica').fontSize(9);
      for (const tx of rows) {
        // Pagination : nouvelle page dès que le bas est atteint.
        if (y > doc.page.height - 100) {
          doc.addPage();
          y = 60;
        }

        const isCredit = CREDIT_TYPES.includes(tx.type);
        const sign = isCredit ? '+' : '−';
        const amount = `${sign}${Number(tx.amount).toLocaleString('fr-FR')} FCFA`;

        doc
          .fillColor(CERCLE.inkSoft)
          .text(new Date(tx.createdAt).toLocaleDateString('fr-FR'), colDate, y)
          .fillColor(CERCLE.navyDark)
          .text(TYPE_LABEL[tx.type] ?? tx.type, colType, y)
          .fillColor(CERCLE.inkSoft)
          .text(tx.user?.fullName ?? '', colMember, y)
          .fillColor(isCredit ? CERCLE.success : CERCLE.navyDark)
          .text(amount, colAmount, y, { align: 'right' })
          .fillColor(CERCLE.inkSoft)
          .text(tx.status, colStatus, y, { align: 'right' });
        y += 18;
      }

      // ---- Total signé — même règle de sens que l'écran 69. ----
      const total = rows.reduce(
        (sum, tx) =>
          sum + (CREDIT_TYPES.includes(tx.type) ? 1 : -1) * Number(tx.amount),
        0,
      );
      doc
        .moveTo(50, y + 6)
        .lineTo(doc.page.width - 50, y + 6)
        .lineWidth(1)
        .strokeColor(CERCLE.sand)
        .stroke();
      doc
        .fillColor(CERCLE.goldText)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('TOTAL', colDate, y + 14)
        .text(`${total.toLocaleString('fr-FR')} FCFA`, colAmount, y + 14, {
          align: 'right',
        });

      // Pied de page discret (maquette : « Cercle · Généré le… »).
      doc
        .fillColor(CERCLE.inkSoft)
        .font('Helvetica')
        .fontSize(7)
        .text(
          'Cercle — relevé généré automatiquement, transactions du ledger append-only.',
          50,
          doc.page.height - 40,
          { align: 'center', width: doc.page.width - 100 },
        );

      doc.end();
    });
  }
}
