import { Test } from '@nestjs/testing';
import { LoansService } from './loans.service';
import { PrismaService } from '../database/prisma.service';

/**
 * Tests du module loans — garde-fous métier des prêts internes :
 * groupe éligible, KYC obligatoire, signature réservée à l'emprunteur.
 */
describe('LoansService', () => {
  let service: LoansService;
  let prisma: Record<string, unknown>;

  beforeEach(async () => {
    prisma = {
      group: { findUnique: jest.fn() },
      user: { findUnique: jest.fn() },
      groupMember: { findUnique: jest.fn(), findFirst: jest.fn() },
      loan: { create: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      loanVote: { upsert: jest.fn() },
      loanRepaymentSchedule: { createMany: jest.fn(), count: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      loanContract: { create: jest.fn(), update: jest.fn() },
      ledgerTransaction: { create: jest.fn(), findFirst: jest.fn() },
      $transaction: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        LoansService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(LoansService);
  });

  describe('request', () => {
    it('refuse un groupe ROTATIVE (pas de prêts internes)', async () => {
      (prisma.group as { findUnique: jest.Mock }).findUnique.mockResolvedValue({ id: 'g1', mode: 'ROTATIVE' });
      await expect(
        service.request('u1', { groupId: 'g1', amount: 5000, durationMonths: 3, reason: 'x' }),
      ).rejects.toThrow('prêts internes');
    });

    it('exige un KYC vérifié', async () => {
      (prisma.group as { findUnique: jest.Mock }).findUnique.mockResolvedValue({ id: 'g1', mode: 'MIXED', interestRate: 0 });
      (prisma.user as { findUnique: jest.Mock }).findUnique.mockResolvedValue({ id: 'u1', kycStatus: 'PENDING' });
      await expect(
        service.request('u1', { groupId: 'g1', amount: 5000, durationMonths: 3, reason: 'x' }),
      ).rejects.toThrow('KYC');
    });

    it('refuse un non-membre actif', async () => {
      (prisma.group as { findUnique: jest.Mock }).findUnique.mockResolvedValue({ id: 'g1', mode: 'MIXED', interestRate: 0 });
      (prisma.user as { findUnique: jest.Mock }).findUnique.mockResolvedValue({ id: 'u1', kycStatus: 'VERIFIED' });
      (prisma.groupMember as { findUnique: jest.Mock }).findUnique.mockResolvedValue(null);
      await expect(
        service.request('u1', { groupId: 'g1', amount: 5000, durationMonths: 3, reason: 'x' }),
      ).rejects.toThrow('membres actifs');
    });
  });

  describe('signContract', () => {
    it('refuse la signature par un non-emprunteur', async () => {
      (prisma.loan as { findUnique: jest.Mock }).findUnique.mockResolvedValue({
        id: 'l1', status: 'APPROVED', borrowerId: 'u1', groupId: 'g1',
        contract: { signedByBorrower: false },
      });
      await expect(service.signContract('l1', 'u2')).rejects.toThrow('emprunteur');
    });

    it('refuse un prêt non approuvé', async () => {
      (prisma.loan as { findUnique: jest.Mock }).findUnique.mockResolvedValue({
        id: 'l1', status: 'VOTING', borrowerId: 'u1', contract: null,
      });
      await expect(service.signContract('l1', 'u1')).rejects.toThrow('approuvé');
    });

    it('refuse une double signature', async () => {
      (prisma.loan as { findUnique: jest.Mock }).findUnique.mockResolvedValue({
        id: 'l1', status: 'APPROVED', borrowerId: 'u1',
        contract: { signedByBorrower: true, signedAt: new Date() },
      });
      await expect(service.signContract('l1', 'u1')).rejects.toThrow('déjà signé');
    });
  });

  describe('vote', () => {
    it('empêche l emprunteur de voter pour sa demande', async () => {
      (prisma.loan as { findUnique: jest.Mock }).findUnique.mockResolvedValue({
        id: 'l1', status: 'VOTING', borrowerId: 'u1', groupId: 'g1',
      });
      (prisma.groupMember as { findUnique: jest.Mock }).findUnique.mockResolvedValue({ id: 'm1', userId: 'u1', isActive: true });
      await expect(service.vote('l1', 'u1', true)).rejects.toThrow('propre demande');
    });
  });
});
