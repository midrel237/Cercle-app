import { Test } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../database/prisma.service';

/**
 * Tests du cron des retards de cotisation (§4.1 du cahier des charges) :
 * membres en retard du cycle actif expiré → notification
 * LATE_PAYMENT_ALERT, sans doublon par cycle, hors des payeurs.
 */
describe('NotificationsService — cron des retards', () => {
  let service: NotificationsService;
  let prisma: Record<string, unknown>;

  const CYCLE_ID = 'cycle-1';
  const GROUP_ID = 'g1';

  beforeEach(async () => {
    prisma = {
      notification: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      cycle: { findMany: jest.fn() },
      ledgerTransaction: { findMany: jest.fn() },
      groupMember: { findMany: jest.fn() },
    };

    const module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(NotificationsService);
  });

  it('notifie les membres actifs non-payeurs du cycle expiré', async () => {
    (prisma.cycle as { findMany: jest.Mock }).findMany.mockResolvedValue([
      {
        id: CYCLE_ID,
        groupId: GROUP_ID,
        cycleNumber: 3,
        dueDate: new Date('2026-10-01'),
        status: 'ACTIVE',
        group: { id: GROUP_ID, name: 'Njangi' },
      },
    ]);
    (prisma.ledgerTransaction as { findMany: jest.Mock }).findMany.mockResolvedValue([
      { userId: 'paid-user' },
    ]);
    (prisma.groupMember as { findMany: jest.Mock }).findMany.mockResolvedValue([
      {
        id: 'm1',
        userId: 'paid-user',
        isActive: true,
        user: { id: 'paid-user', fullName: 'Paya', language: 'FR' },
      },
      {
        id: 'm2',
        userId: 'late-user',
        isActive: true,
        user: { id: 'late-user', fullName: 'Robert T.', language: 'FR' },
      },
    ]);
    (prisma.notification as { findFirst: jest.Mock }).findFirst.mockResolvedValue(null);
    (prisma.notification as { create: jest.Mock }).create.mockResolvedValue({});

    await service.handleLateContributions();

    const create = prisma.notification as { create: jest.Mock };
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].data).toMatchObject({
      userId: 'late-user',
      type: 'LATE_PAYMENT_ALERT',
    });
    expect(create.mock.calls[0][0].data.body).toContain(CYCLE_ID);
  });

  it('ne re-notifie pas un membre deja alerte pour ce cycle (anti-doublon)', async () => {
    (prisma.cycle as { findMany: jest.Mock }).findMany.mockResolvedValue([
      {
        id: CYCLE_ID,
        groupId: GROUP_ID,
        cycleNumber: 3,
        dueDate: new Date('2026-10-01'),
        status: 'ACTIVE',
        group: { id: GROUP_ID, name: 'Njangi' },
      },
    ]);
    (prisma.ledgerTransaction as { findMany: jest.Mock }).findMany.mockResolvedValue([]);
    (prisma.groupMember as { findMany: jest.Mock }).findMany.mockResolvedValue([
      {
        id: 'm1',
        userId: 'late-user',
        isActive: true,
        user: { id: 'late-user', fullName: 'Robert T.', language: 'FR' },
      },
    ]);
    (prisma.notification as { findFirst: jest.Mock }).findFirst.mockResolvedValue({
      id: 'existing',
      userId: 'late-user',
      type: 'LATE_PAYMENT_ALERT',
    });

    await service.handleLateContributions();

    expect(prisma.notification as { create: jest.Mock }).not.toHaveBeenCalled();
  });

  it('envoie le message en anglais pour un utilisateur de langue EN', async () => {
    (prisma.cycle as { findMany: jest.Mock }).findMany.mockResolvedValue([
      {
        id: CYCLE_ID,
        groupId: GROUP_ID,
        cycleNumber: 3,
        dueDate: new Date('2026-10-01'),
        status: 'ACTIVE',
        group: { id: GROUP_ID, name: 'Njangi' },
      },
    ]);
    (prisma.ledgerTransaction as { findMany: jest.Mock }).findMany.mockResolvedValue([]);
    (prisma.groupMember as { findMany: jest.Mock }).findMany.mockResolvedValue([
      {
        id: 'm1',
        userId: 'late-user',
        isActive: true,
        user: { id: 'late-user', fullName: 'Robert T.', language: 'EN' },
      },
    ]);
    (prisma.notification as { findFirst: jest.Mock }).findFirst.mockResolvedValue(null);
    (prisma.notification as { create: jest.Mock }).create.mockResolvedValue({});

    await service.handleLateContributions();

    const create = prisma.notification as { create: jest.Mock };
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].data.title).toBe('Late contribution');
    expect(create.mock.calls[0][0].data.body).toContain('is late');
  });

  it('ne fait rien quand aucun cycle actif n est expire', async () => {
    (prisma.cycle as { findMany: jest.Mock }).findMany.mockResolvedValue([]);

    await service.handleLateContributions();

    expect(prisma.groupMember as { findMany: jest.Mock }).not.toHaveBeenCalled();
    expect(prisma.notification as { create: jest.Mock }).not.toHaveBeenCalled();
  });
});
