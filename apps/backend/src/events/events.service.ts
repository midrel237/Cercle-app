import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { ContributeEventDto } from './dto/contribute-event.dto';

/**
 * Cagnottes évènementielles (deuil, anniversaire, naissance, mariage,
 * maladie...) — distinctes du cycle rotatif. Chaque membre du groupe cotise
 * librement pour le bénéficiaire de l'évènement ; comme pour les cotisations
 * de cycle, les fonds transitent vers le compte de dépôt du caissier qui
 * reverse ensuite au bénéficiaire (Option A, cf. cahier des charges §7).
 */
@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateEventDto) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: dto.groupId, userId } },
    });
    if (!membership || !membership.isActive) {
      throw new ForbiddenException('Vous n’êtes pas membre de ce groupe.');
    }

    const beneficiary = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: dto.groupId, userId: dto.beneficiaryUserId } },
    });
    if (!beneficiary) {
      throw new BadRequestException('Le bénéficiaire doit être membre du groupe.');
    }

    return this.prisma.groupEvent.create({
      data: {
        groupId: dto.groupId,
        type: dto.type,
        customLabel: dto.customLabel,
        beneficiaryUserId: dto.beneficiaryUserId,
        description: dto.description,
        suggestedAmount: dto.suggestedAmount,
        createdById: userId,
      },
      include: { beneficiary: true },
    });
  }

  async findForGroup(groupId: string) {
    return this.prisma.groupEvent.findMany({
      where: { groupId },
      include: { beneficiary: true, contributions: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(eventId: string) {
    const event = await this.prisma.groupEvent.findUnique({
      where: { id: eventId },
      include: { beneficiary: true, contributions: { include: { user: true } } },
    });
    if (!event) throw new NotFoundException('Évènement introuvable.');
    return event;
  }

  /**
   * Enregistre la cotisation d'un membre à l'évènement. Le paiement Mobile
   * Money lui-même (vers le compte de dépôt du caissier) est orchestré par
   * le module payments ; cette méthode trace la cotisation côté évènement
   * une fois le paiement confirmé.
   */
  async contribute(eventId: string, userId: string, dto: ContributeEventDto) {
    const event = await this.prisma.groupEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Évènement introuvable.');
    if (event.status !== 'OPEN') {
      throw new BadRequestException('Cet évènement n’accepte plus de cotisations.');
    }

    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: event.groupId, userId } },
    });
    if (!membership || !membership.isActive) {
      throw new ForbiddenException('Vous n’êtes pas membre de ce groupe.');
    }

    return this.prisma.eventContribution.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId, amount: dto.amount },
      update: { amount: dto.amount },
    });
  }

  async close(eventId: string, requesterId: string) {
    const event = await this.prisma.groupEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Évènement introuvable.');
    if (event.beneficiaryUserId !== requesterId && event.createdById !== requesterId) {
      throw new ForbiddenException('Seul le bénéficiaire ou l’auteur peut clôturer l’évènement.');
    }

    return this.prisma.groupEvent.update({
      where: { id: eventId },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
  }
}
