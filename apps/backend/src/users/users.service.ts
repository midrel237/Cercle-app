import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SubmitKycDto } from './dto/submit-kyc.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    return user;
  }

  async submitKyc(userId: string, dto: SubmitKycDto) {
    await this.prisma.kycDocument.create({
      data: { userId, ...dto, status: 'PENDING' },
    });
    return this.prisma.user.update({
      where: { id: userId },
      data: { kycStatus: 'PENDING' },
    });
  }

  /**
   * Simule la décision KYC (à remplacer par un provider de vérification
   * d'identité réel ou une revue manuelle en back-office).
   */
  async reviewKyc(userId: string, approved: boolean, rejectionReason?: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { kycStatus: approved ? 'VERIFIED' : 'REJECTED' },
    });
  }

  async updateProfile(userId: string, data: { fullName?: string; language?: 'FR' | 'EN' }) {
    return this.prisma.user.update({ where: { id: userId }, data });
  }
}
