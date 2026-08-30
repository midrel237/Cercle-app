import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { GroupMember, LoanVote } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { RequestLoanDto } from './dto/request-loan.dto';

@Injectable()
export class LoansService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.loan.create({
      data: {
        groupId: dto.groupId,
        borrowerId,
        amount: dto.amount,
        interestRate: group.interestRate,
        status: 'VOTING',
      },
    });
  }

  async vote(loanId: string, voterId: string, approve: boolean) {
    await this.prisma.loanVote.upsert({
      where: { loanId_voterId: { loanId, voterId } },
      update: { approve },
      create: { loanId, voterId, approve },
    });
    return this.evaluateVotes(loanId);
  }

  /** Règle MVP simple : majorité des membres actifs du groupe doit approuver. */
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
      return this.prisma.loan.update({
        where: { id: loanId },
        data: { status: 'APPROVED', approvedAt: new Date() },
      });
    }
    if (rejections >= majority) {
      return this.prisma.loan.update({ where: { id: loanId }, data: { status: 'REJECTED' } });
    }
    return loan;
  }

  async findForGroup(groupId: string) {
    return this.prisma.loan.findMany({ where: { groupId }, include: { borrower: true } });
  }

  async findOne(id: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id },
      include: { votes: true, repaymentSchedule: true, contract: true, borrower: true },
    });
    if (!loan) throw new NotFoundException('Prêt introuvable.');
    return loan;
  }
}
