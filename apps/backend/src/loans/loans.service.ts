import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { GroupMember, LoanVote } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { RequestLoanDto } from './dto/request-loan.dto';

@Injectable()
export class LoansService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Écran 58 — Demande de prêt. Crée la demande en VOTING ; l'échéancier
   * prévisionnel est calculé (et affiché par le client) mais n'est
   * PERSISTÉ qu'à l'approbation (evaluateVotes) : un prêt refusé ne laisse
   * aucune trace d'échéances (ledger/traçabilité §6.2 — on ne crée que ce
   * qui est engagé).
   */
  async request(borrowerId: string, dto: RequestLoanDto) {
    const group = await this.prisma.group.findUnique({ where: { id: dto.groupId } });
    if (!group) throw new NotFoundException('Groupe introuvable.');
    if (group.mode === 'ROTATIVE') {
      throw new BadRequestException('Ce groupe ne permet pas les prêts internes.');
    }

    const borrower = await this.prisma.user.findUnique({ where: { id: borrowerId } });
    if (borrower?.kycStatus !== 'VERIFIED') {
      throw new ForbiddenException('KYC requis avant toute demande de prêt.');
    }

    // Le demandeur doit être membre actif du groupe.
    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: dto.groupId, userId: borrowerId } },
    });
    if (!membership || !membership.isActive) {
      throw new ForbiddenException('Seuls les membres actifs peuvent demander un prêt.');
    }

    // Garant optionnel : membre actif du groupe, distinct de l'emprunteur.
    if (dto.guarantorId) {
      const guarantor = await this.prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: dto.groupId, userId: dto.guarantorId } },
      });
      if (!guarantor || !guarantor.isActive) {
        throw new BadRequestException('Le garant doit être un membre actif du groupe.');
      }
      if (dto.guarantorId === borrowerId) {
        throw new BadRequestException('Le garant ne peut pas être l’emprunteur lui-même.');
      }
    }

    // Une seule demande en cours par membre et par groupe.
    const pending = await this.prisma.loan.findFirst({
      where: {
        groupId: dto.groupId,
        borrowerId,
        status: { in: ['VOTING', 'APPROVED'] },
      },
    });
    if (pending) {
      throw new BadRequestException('Une demande de prêt est déjà en cours pour ce groupe.');
    }

    // Échéancier prévisionnel — montant total (intérêts inclus) réparti en
    // `durationMonths` échéances mensuelles (maquette 58 : 25 000 × 3).
    const schedule = this.previewSchedule(dto.amount, dto.durationMonths, Number(group.interestRate));

    return {
      loan: await this.prisma.loan.create({
        data: {
          groupId: dto.groupId,
          borrowerId,
          amount: dto.amount,
          interestRate: group.interestRate,
          status: 'VOTING',
        },
      }),
      schedulePreview: schedule,
    };
  }

  /** Échéancier prévisionnel : intérêts simples, échéances mensuelles égales. */
  private previewSchedule(amount: number, months: number, interestRate: number) {
    const interest = Math.round(amount * (interestRate / 100));
    const total = amount + interest;
    const installment = Math.floor(total / months);
    const firstDue = new Date();
    firstDue.setMonth(firstDue.getMonth() + 1);

    return Array.from({ length: months }, (_, i) => ({
      installmentNumber: i + 1,
      dueDate: new Date(
        firstDue.getFullYear(),
        firstDue.getMonth() + i,
        firstDue.getDate(),
      ),
      amount: i === months - 1 ? total - installment * (months - 1) : installment,
    }));
  }

  async vote(loanId: string, voterId: string, approve: boolean) {
    const loan = await this.prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) throw new NotFoundException('Prêt introuvable.');
    if (loan.status !== 'VOTING') {
      throw new BadRequestException('Ce prêt n’est plus en cours de validation.');
    }

    // Seuls les membres actifs du groupe (hors emprunteur) votent.
    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: loan.groupId, userId: voterId } },
    });
    if (!membership || !membership.isActive) {
      throw new ForbiddenException('Seuls les membres du groupe peuvent voter.');
    }
    if (loan.borrowerId === voterId) {
      throw new BadRequestException('L’emprunteur ne peut pas voter pour sa propre demande.');
    }

    await this.prisma.loanVote.upsert({
      where: { loanId_voterId: { loanId, voterId } },
      update: { approve },
      create: { loanId, voterId, approve },
    });
    return this.evaluateVotes(loanId);
  }

  /**
   * Règle MVP (maquette 59) : majorité des membres actifs du groupe doit
   * approuver. À l'approbation : échéancier persisté + contrat créé
   * (REF générée, signature en attente — écrans 60→62-63).
   */
  private async evaluateVotes(loanId: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: { votes: true, group: { include: { members: true } } },
    });
    if (!loan) throw new NotFoundException('Prêt introuvable.');

    const activeMembers = loan.group.members.filter((m: GroupMember) => m.isActive).length;
    const approvals = loan.votes.filter((v: LoanVote) => v.approve).length;
    const rejections = loan.votes.filter((v: LoanVote) => !v.approve).length;
    const majority = Math.floor(activeMembers / 2) + 1;

    if (approvals >= majority) {
      // Persiste l'échéancier réel (mêmes règles que le prévisionnel) puis
      // passe le prêt en APPROVED avec contrat en attente de signature.
      const months = await this.inferDurationMonths(loan);
      const schedule = this.previewSchedule(
        Number(loan.amount),
        months,
        Number(loan.interestRate),
      );

      const [updated] = await this.prisma.$transaction([
        this.prisma.loan.update({
          where: { id: loanId },
          data: { status: 'APPROVED', approvedAt: new Date() },
        }),
        this.prisma.loanRepaymentSchedule.createMany({
          data: schedule.map((s) => ({
            loanId,
            installmentNumber: s.installmentNumber,
            dueDate: s.dueDate,
            amount: s.amount,
          })),
        }),
        this.prisma.loanContract.create({
          data: { loanId },
        }),
      ]);
      return updated;
    }
    if (rejections >= majority) {
      return this.prisma.loan.update({ where: { id: loanId }, data: { status: 'REJECTED' } });
    }
    return loan;
  }

  /** Durée déduite de l'échéancier si persisté, sinon du montant (fallback 3). */
  private async inferDurationMonths(loan: { id: string }) {
    const count = await this.prisma.loanRepaymentSchedule.count({ where: { loanId: loan.id } });
    return count > 0 ? count : 3;
  }

  /** Écran 57 — prêts de l'utilisateur (actifs + soldés) par groupe. */
  async findMine(userId: string) {
    const loans = await this.prisma.loan.findMany({
      where: { borrowerId: userId },
      include: {
        group: { select: { id: true, name: true } },
        repaymentSchedule: { orderBy: { installmentNumber: 'asc' } },
        contract: true,
      },
      orderBy: { requestedAt: 'desc' },
    });

    return loans.map((l) => {
      const paid = l.repaymentSchedule.filter((s) => s.status === 'PAID');
      const remaining = l.repaymentSchedule
        .filter((s) => s.status !== 'PAID')
        .reduce((sum, s) => sum + Number(s.amount), 0);
      const next = l.repaymentSchedule.find((s) => s.status === 'PENDING');
      const totalWithInterest = l.repaymentSchedule.reduce(
        (sum, s) => sum + Number(s.amount),
        0,
      );
      return {
        id: l.id,
        groupId: l.groupId,
        groupName: l.group.name,
        amount: l.amount,
        interestRate: l.interestRate,
        status: l.status,
        requestedAt: l.requestedAt,
        approvedAt: l.approvedAt,
        contractSigned: l.contract?.signedByBorrower ?? false,
        installmentsPaid: paid.length,
        installmentsTotal: l.repaymentSchedule.length,
        remainingAmount: remaining,
        totalWithInterest,
        nextDueDate: next?.dueDate ?? null,
        nextInstallmentAmount: next?.amount ?? null,
      };
    });
  }

  async findForGroup(groupId: string) {
    return this.prisma.loan.findMany({
      where: { groupId },
      include: {
        borrower: { select: { id: true, fullName: true } },
        votes: { include: { voter: { select: { id: true, fullName: true } } } },
      },
      orderBy: { requestedAt: 'desc' },
    });
  }

  /** Écran 59 — détail du vote : demande, votes par membre, majorité requise. */
  async findOne(id: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id },
      include: {
        borrower: { select: { id: true, fullName: true } },
        votes: { include: { voter: { select: { id: true, fullName: true } } } },
        repaymentSchedule: { orderBy: { installmentNumber: 'asc' } },
        contract: true,
      },
    });
    if (!loan) throw new NotFoundException('Prêt introuvable.');

    const activeMembers = await this.prisma.groupMember.count({
      where: { groupId: loan.groupId, isActive: true },
    });

    return {
      ...loan,
      majorityRequired: Math.floor(activeMembers / 2) + 1,
      approvals: loan.votes.filter((v) => v.approve).length,
      rejections: loan.votes.filter((v) => !v.approve).length,
      activeMembers,
    };
  }

  /**
   * Écran 63 — signature du contrat par l'emprunteur. Uniquement après
   * approbation ; le prêt passe ACTIVE et la transaction LOAN_DISBURSEMENT
   * (versement des fonds par le caissier, Option A) est tracée PENDING
   * dans le ledger — elle sera confirmée comme toute transaction Mobile
   * Money par le webhook.
   */
  async signContract(loanId: string, userId: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: { contract: true },
    });
    if (!loan) throw new NotFoundException('Prêt introuvable.');
    if (loan.status !== 'APPROVED') {
      throw new BadRequestException('Seul un prêt approuvé peut être signé.');
    }
    if (loan.borrowerId !== userId) {
      throw new ForbiddenException('Seul l’emprunteur peut signer ce contrat.');
    }
    if (loan.contract?.signedByBorrower) {
      throw new BadRequestException('Ce contrat est déjà signé.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.loanContract.update({
        where: { loanId },
        data: { signedByBorrower: true, signedAt: new Date() },
      });
      const updated = await tx.loan.update({
        where: { id: loanId },
        data: { status: 'ACTIVE', dueDate: null },
      });
      await tx.ledgerTransaction.create({
        data: {
          groupId: loan.groupId,
          userId: loan.borrowerId,
          type: 'LOAN_DISBURSEMENT',
          amount: loan.amount,
          currency: 'XAF',
          amountXaf: loan.amount,
          status: 'PENDING',
        },
      });
      return updated;
    });
  }

  /**
   * Écrans 65-66 — rembourser une échéance : prépare la transaction
   * LOAN_REPAYMENT PENDING dans le ledger (paiement Mobile Money via le
   * flux existant). L'échéance est marquée PAID à la confirmation du
   * webhook (confirmRepayment) — jamais avant (même règle que les
   * cotisations, §6.2).
   */
  async prepareRepayment(loanId: string, userId: string, installmentNumber: number) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: { repaymentSchedule: true },
    });
    if (!loan) throw new NotFoundException('Prêt introuvable.');
    if (loan.borrowerId !== userId) {
      throw new ForbiddenException('Seul l’emprunteur peut rembourser ce prêt.');
    }
    if (loan.status !== 'ACTIVE') {
      throw new BadRequestException('Ce prêt n’est pas actif.');
    }

    const installment = loan.repaymentSchedule.find(
      (s) => s.installmentNumber === installmentNumber,
    );
    if (!installment) throw new NotFoundException('Échéance introuvable.');
    if (installment.status === 'PAID') {
      throw new BadRequestException('Cette échéance est déjà payée.');
    }

    // Anti-doublon : pas de remboursement PENDING en cours pour cette échéance.
    const pending = await this.prisma.ledgerTransaction.findFirst({
      where: {
        groupId: loan.groupId,
        userId,
        type: 'LOAN_REPAYMENT',
        status: 'PENDING',
      },
    });
    if (pending) {
      throw new BadRequestException('Un remboursement est déjà en cours.');
    }

    return this.prisma.ledgerTransaction.create({
      data: {
        groupId: loan.groupId,
        userId,
        type: 'LOAN_REPAYMENT',
        amount: installment.amount,
        currency: 'XAF',
        amountXaf: installment.amount,
        status: 'PENDING',
      },
    });
  }

  /** Appelé après confirmation webhook d'un LOAN_REPAYMENT. */
  async confirmRepayment(transactionId: string) {
    const tx = await this.prisma.ledgerTransaction.findUnique({
      where: { id: transactionId },
    });
    if (!tx || tx.type !== 'LOAN_REPAYMENT') return null;

    // Première échéance non payée du prêt de cet emprunteur (ordre croissant).
    const schedule = await this.prisma.loanRepaymentSchedule.findFirst({
      where: { status: { in: ['PENDING', 'LATE'] }, loan: { borrowerId: tx.userId } },
      orderBy: { installmentNumber: 'asc' },
    });
    if (!schedule) return null;

    await this.prisma.loanRepaymentSchedule.update({
      where: { id: schedule.id },
      data: { status: 'PAID', paidAt: new Date() },
    });

    // Dernière échéance soldée → prêt REPAID.
    const remaining = await this.prisma.loanRepaymentSchedule.count({
      where: { loanId: schedule.loanId, status: { in: ['PENDING', 'LATE'] } },
    });
    if (remaining === 0) {
      await this.prisma.loan.update({
        where: { id: schedule.loanId },
        data: { status: 'REPAID' },
      });
    }
    return schedule;
  }
}
