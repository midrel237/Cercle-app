import { Test } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { TransactionsService } from '../transactions/transactions.service';
import { LoansService } from '../loans/loans.service';
import { PrismaService } from '../database/prisma.service';
import { MobileMoneyAggregator } from './mobile-money-aggregator.interface';

/**
 * Tests du module payments — garde-fous du webhook et de la préparation
 * de cotisation (traçabilité §6.2 : rien n'est confirmé sans signature).
 */
describe('PaymentsService', () => {
  let service: PaymentsService;
  let aggregator: { initiateCharge: jest.Mock; verifyWebhookSignature: jest.Mock };
  let transactions: { createPending: jest.Mock; confirm: jest.Mock; markFailed: jest.Mock };
  let loans: { confirmRepayment: jest.Mock };
  let prisma: Record<string, unknown>;

  beforeEach(async () => {
    aggregator = {
      initiateCharge: jest.fn(),
      verifyWebhookSignature: jest.fn().mockReturnValue(true),
    };
    transactions = {
      createPending: jest.fn(),
      confirm: jest.fn(),
      markFailed: jest.fn(),
    };
    loans = { confirmRepayment: jest.fn() };
    prisma = {
      groupMember: { findUnique: jest.fn() },
      group: { findUnique: jest.fn(), findFirst: jest.fn() },
      groupEvent: { findFirst: jest.fn() },
      eventContribution: { findFirst: jest.fn(), upsert: jest.fn() },
      ledgerTransaction: { findFirst: jest.fn(), update: jest.fn() },
      paymentMethod: { findMany: jest.fn(), create: jest.fn(), updateMany: jest.fn() },
    };

    const module = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: 'MOBILE_MONEY_AGGREGATOR', useValue: aggregator },
        { provide: TransactionsService, useValue: transactions },
        { provide: LoansService, useValue: loans },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(PaymentsService);
  });

  describe('handleWebhook', () => {
    it('confirme la transaction quand le webhook est signé et accepté', async () => {
      transactions.confirm.mockResolvedValue({ id: 'tx1', type: 'CONTRIBUTION' });

      await service.handleWebhook('{}', 'sig', {
        transactionId: 'tx1',
        externalReference: 'tok',
        status: 'confirmed',
      });

      expect(aggregator.verifyWebhookSignature).toHaveBeenCalledWith('{}', 'sig');
      expect(transactions.confirm).toHaveBeenCalledWith('tx1', 'tok');
    });

    it('marque FAILED quand le webhook annonce un échec', async () => {
      await service.handleWebhook('{}', 'sig', {
        transactionId: 'tx2',
        externalReference: 'tok2',
        status: 'failed',
      });

      expect(transactions.markFailed).toHaveBeenCalledWith('tx2');
    });

    it('rejette un webhook sans signature valide', async () => {
      aggregator.verifyWebhookSignature.mockReturnValue(false);
      await expect(
        service.handleWebhook('{}', 'bad', {
          transactionId: 'tx1',
          externalReference: 't',
          status: 'confirmed',
        }),
      ).rejects.toThrow('Signature de webhook invalide.');
    });

    it('confirme aussi l échéance quand la transaction est un LOAN_REPAYMENT', async () => {
      transactions.confirm.mockResolvedValue({ id: 'tx3', type: 'LOAN_REPAYMENT' });

      await service.handleWebhook('{}', 'sig', {
        transactionId: 'tx3',
        externalReference: 'tok3',
        status: 'confirmed',
      });

      expect(loans.confirmRepayment).toHaveBeenCalledWith('tx3');
    });
  });

  describe('prepareContribution — garde-fous', () => {
    it('refuse un non-membre du groupe', async () => {
      (prisma.groupMember as { findUnique: jest.Mock }).findUnique.mockResolvedValue(null);
      await expect(
        service.prepareContribution('u1', { groupId: 'g1' } as never),
      ).rejects.toThrow('membre');
    });

    it('refuse les moyens bancaires hors groupe diaspora', async () => {
      (prisma.group as { findFirst: jest.Mock }).findFirst.mockResolvedValue(null);
      await expect(
        service.addPaymentMethod('u1', {
          type: 'BANK_CARD',
        } as never),
      ).rejects.toThrow('diaspora');
    });
  });
});
