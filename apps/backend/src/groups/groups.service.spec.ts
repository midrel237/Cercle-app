import { Test } from '@nestjs/testing';
import { GroupsService } from './groups.service';
import { PrismaService } from '../database/prisma.service';
import { SmsService } from '../common/sms/sms.service';

/**
 * Tests du module groups — garde-fous d'administration (Phase 4) :
 * retrait de membre protégé, relance SMS, décision d'adhésion.
 *
 * NOTE mocks : chaque méthode du service commence par assertIsAdmin
 * (groupMember.findUnique sur groupId_userId) puis interroge le membre
 * cible (groupMember.findFirst). Chaque test doit donc configurer les
 * DEUX appels — un seul mock laisse le second renvoyer undefined et
 * la garde NotFound/Forbidden échoue au mauvais endroit.
 */
describe('GroupsService — membres & administration', () => {
  let service: GroupsService;
  let prisma: Record<string, unknown>;
  let sms: { send: jest.Mock };

  beforeEach(async () => {
    prisma = {
      groupMember: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      group: { findUnique: jest.fn(), update: jest.fn() },
      groupEvent: { findMany: jest.fn() },
      cycle: { findFirst: jest.fn(), count: jest.fn() },
      ledgerTransaction: { findMany: jest.fn(), aggregate: jest.fn(), create: jest.fn() },
      loan: { count: jest.fn() },
      notification: { create: jest.fn() },
    };
    sms = { send: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        GroupsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SmsService, useValue: sms },
      ],
    }).compile();
    service = module.get(GroupsService);
  });

  describe('removeMember — protections admin', () => {
    it('empêche un admin de se retirer lui-même', async () => {
      (prisma.groupMember as { findUnique: jest.Mock }).findUnique.mockResolvedValue({
        id: 'ma', userId: 'admin1', role: 'ADMIN', isActive: true,
      });
      (prisma.groupMember as { findFirst: jest.Mock }).findFirst.mockResolvedValue({
        id: 'm1', userId: 'admin1', role: 'ADMIN', isActive: true,
      });
      await expect(
        service.removeMember('g1', 'admin1', { memberId: 'm1' }),
      ).rejects.toThrow('lui-même');
    });

    it('empêche le retrait d un autre admin', async () => {
      (prisma.groupMember as { findUnique: jest.Mock }).findUnique.mockResolvedValue({
        id: 'ma', userId: 'admin1', role: 'ADMIN', isActive: true,
      });
      (prisma.groupMember as { findFirst: jest.Mock }).findFirst.mockResolvedValue({
        id: 'm2', userId: 'a2', role: 'ADMIN', isActive: true,
      });
      await expect(
        service.removeMember('g1', 'admin1', { memberId: 'm2' }),
      ).rejects.toThrow('administrateur');
    });

    it('refuse le retrait d un membre déjà inactif', async () => {
      (prisma.groupMember as { findUnique: jest.Mock }).findUnique.mockResolvedValue({
        id: 'ma', userId: 'admin1', role: 'ADMIN', isActive: true,
      });
      (prisma.groupMember as { findFirst: jest.Mock }).findFirst.mockResolvedValue({
        id: 'm3', userId: 'u3', role: 'MEMBER', isActive: false,
      });
      await expect(
        service.removeMember('g1', 'admin1', { memberId: 'm3' }),
      ).rejects.toThrow('déjà quitté');
    });
  });

  describe('sendContributionReminder', () => {
    it('crée une notification et envoie un SMS quand demandé', async () => {
      (prisma.groupMember as { findUnique: jest.Mock }).findUnique.mockResolvedValue({
        id: 'ma', userId: 'admin1', role: 'ADMIN', isActive: true,
      });
      (prisma.groupMember as { findFirst: jest.Mock }).findFirst.mockResolvedValue({
        id: 'm1', groupId: 'g1', userId: 'u1', isActive: true,
        user: { id: 'u1', fullName: 'Robert T.', phoneNumber: '+237600000000' },
        group: { name: 'Njangi', contributionAmount: 10000 },
      });
      (prisma.notification as { create: jest.Mock }).create.mockResolvedValue({});

      const result = await service.sendContributionReminder('g1', 'admin1', 'm1', {
        message: 'Rappel test',
        alsoSms: true,
      });

      expect(prisma.notification as { create: jest.Mock }).toBeDefined();
      expect(sms.send).toHaveBeenCalled();
      expect(result.channel).toBe('NOTIFICATION+SMS');
    });

    it('n envoie pas de SMS quand l option est désactivée', async () => {
      (prisma.groupMember as { findUnique: jest.Mock }).findUnique.mockResolvedValue({
        id: 'ma', userId: 'admin1', role: 'ADMIN', isActive: true,
      });
      (prisma.groupMember as { findFirst: jest.Mock }).findFirst.mockResolvedValue({
        id: 'm1', groupId: 'g1', userId: 'u1', isActive: true,
        user: { id: 'u1', fullName: 'Robert T.', phoneNumber: '+237600000000' },
        group: { name: 'Njangi', contributionAmount: 10000 },
      });

      await service.sendContributionReminder('g1', 'admin1', 'm1', {
        alsoSms: false,
      });

      expect(sms.send).not.toHaveBeenCalled();
    });
  });

  describe('decideJoin', () => {
    it('refuse une décision hors statut PENDING', async () => {
      (prisma.groupMember as { findUnique: jest.Mock }).findUnique.mockResolvedValue({ id: 'admin', role: 'ADMIN' });
      (prisma.groupMember as { findFirst: jest.Mock }).findFirst.mockResolvedValue({
        id: 'm1', groupId: 'g1', joinStatus: 'APPROVED',
      });
      await expect(
        service.decideJoin('g1', 'admin1', { memberId: 'm1', approve: true }),
      ).rejects.toThrow('en attente');
    });
  });
});
