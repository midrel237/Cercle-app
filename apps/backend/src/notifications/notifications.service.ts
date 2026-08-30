import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

/**
 * Envoi de notifications push (Expo Notifications) + SMS de secours,
 * conformément au cahier des charges §4.1 "Notifications".
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, type: string, title: string, body: string) {
    const notification = await this.prisma.notification.create({
      data: { userId, type: type as any, title, body },
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

  private async dispatch(userId: string, title: string, body: string) {
    // TODO: envoyer via Expo Push Notifications (token stocké côté user)
    // et, en secours, via la passerelle SMS locale si le push échoue.
  }
}
