import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    return user;
  }

  /**
   * Ecran 72 - Profil & fiabilite : nom, KYC verifie, numero, score de
   * fiabilite, moyens de paiement et compte de groupes actifs. Toutes les
   * donnees derivent du ledger / des tables existantes - jamais en dur.
   */
  async findProfile(userId: string) {
    // Le modele User expose la relation `memberships` (GroupMember[]),
    // pas `groups` — le compte filtre sur les memberships actifs.
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: { select: { memberships: { where: { isActive: true } } } },
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');

    const paymentMethods = await this.prisma.paymentMethod.findMany({
      where: { userId },
      select: { id: true, type: true, provider: true },
    });

    // Cotisations payees a temps : confirmedAt <= dueDate du cycle rattache.
    const contributions = await this.prisma.ledgerTransaction.findMany({
      where: { userId, type: 'CONTRIBUTION', status: 'CONFIRMED' },
      include: { cycle: { select: { dueDate: true } } },
    });
    const onTime = contributions.filter(
      (c) => c.cycle && c.confirmedAt && c.confirmedAt <= c.cycle.dueDate,
    ).length;

    return {
      id: user.id,
      phoneNumber: user.phoneNumber,
      fullName: user.fullName,
      kycStatus: user.kycStatus,
      trustScore: user.trustScore,
      language: user.language,
      activeGroups: user._count.memberships,
      paymentMethods,
      contributionsPaid: contributions.length,
      contributionsOnTime: onTime,
    };
  }

  async updateProfile(userId: string, data: { fullName?: string; language?: 'FR' | 'EN' }) {
    return this.prisma.user.update({ where: { id: userId }, data });
  }
}
