import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';

/**
 * Envoi de notifications push (Expo Notifications) + SMS de secours,
 * conformément au cahier des charges §4.1 "Notifications".
 *
 * Cron des retards (cahier des charges §4.1) : balaie chaque heure les
 * cycles actifs dont la date d'échéance est passée et notifie les
 * membres actifs qui n'ont pas encore cotisé pour ce cycle
 * (LATE_PAYMENT_ALERT). Garde anti-doublon : une seule notification de
 * retard par membre et par cycle — sinon l'alerte serait recréée à
 * chaque passage du cron alors que le membre reste en retard.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, type: string, title: string, body: string) {
    const notification = await this.prisma.notification.create({
      data: { userId, type: type as never, title, body },
    });
    await this.dispatch(userId, title, body);
    return notification;
  }

  async listForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markRead(id: string) {
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  /**
   * Cron horaire — retards de cotisation des cycles actifs expirés.
   *
   * Sélection : cycles ACTIVE avec dueDate < maintenant, membres actifs du
   * groupe sans cotisation CONFIRMED sur ce cycle. Un membre déjà notifié
   * pour ce cycle n'est pas re-notifié (garde anti-doublon sur le corps
   * de la notification, qui contient l'identifiant du cycle).
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleLateContributions() {
    const now = new Date();
    let lateCount = 0;

    // Cycles actifs dont l'échéance est passée.
    const overdueCycles = await this.prisma.cycle.findMany({
      where: { status: 'ACTIVE', dueDate: { lt: now } },
      include: { group: { select: { id: true, name: true } } },
    });

    for (const cycle of overdueCycles) {
      // Cotisations confirmées de ce cycle → membres à jour.
      const paidTx = await this.prisma.ledgerTransaction.findMany({
        where: {
          cycleId: cycle.id,
          type: 'CONTRIBUTION',
          status: 'CONFIRMED',
        },
        select: { userId: true },
      });
      const paidUserIds = new Set(paidTx.map((t) => t.userId));

      // Membres actifs du groupe — un membre absent des payeurs est en retard.
      const members = await this.prisma.groupMember.findMany({
        where: { groupId: cycle.groupId, isActive: true },
        include: { user: { select: { id: true, fullName: true, language: true } } },
      });

      for (const member of members) {
        if (paidUserIds.has(member.userId)) continue;
        const language = member.user.language;

        // Anti-doublon : le corps contient l'identifiant du cycle —
        // si une notification LATE_PAYMENT_ALERT identique existe déjà
        // pour cet utilisateur, le membre a déjà été alerté pour ce cycle.
        const alreadyNotified = await this.prisma.notification.findFirst({
          where: {
            userId: member.userId,
            type: 'LATE_PAYMENT_ALERT',
            body: { contains: cycle.id },
          },
        });
        if (alreadyNotified) continue;

        const title =
          language === 'FR'
            ? 'Cotisation en retard'
            : 'Late contribution';
        const body =
          language === 'FR'
            ? `Votre cotisation au groupe « ${cycle.group.name} » (cycle ${cycle.cycleNumber}, échéance ${cycle.dueDate.toLocaleDateString('fr-FR')}) est en retard. Merci de la régulariser. [cycle:${cycle.id}]`
            : `Your contribution to group "${cycle.group.name}" (cycle ${cycle.cycleNumber}, due ${cycle.dueDate.toLocaleDateString('en-US')}) is late. Please catch up. [cycle:${cycle.id}]`;

        await this.create(member.userId, 'LATE_PAYMENT_ALERT', title, body);
        lateCount++;
      }
    }

    if (lateCount > 0) {
      this.logger.log(`Cron retards : ${lateCount} notification(s) LATE_PAYMENT_ALERT envoyée(s).`);
    }
  }

  private async dispatch(userId: string, title: string, body: string) {
    // TODO: envoyer via Expo Push Notifications (token stocké côté user)
    // et, en secours, via la passerelle SMS locale si le push échoue.
  }
}
