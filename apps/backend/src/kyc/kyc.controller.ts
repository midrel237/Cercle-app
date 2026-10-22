import { Body, Controller, Get, Logger, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../database/prisma.service';
import { DiditService } from './didit.service';

/** Statuts métier Cercle mappés depuis le statut Didit v3. */
export type CercleKycStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

/**
 * Cartographie des statuts Didit v3 (casse exacte, cf. docs.didit.me
 * /integration/verification-statuses) vers Cercle :
 *   "Approved"  -> VERIFIED
 *   "Declined"  -> REJECTED
 *   tout le reste ("Not Started", "In Progress", "Awaiting User",
 *   "Resubmitted", "In Review", "Expired", "Abandoned", "Kyc Expired")
 *   -> PENDING
 * Exportée car partagée entre le polling de secours de /kyc/me/status
 * (ce contrôleur) et le webhook public (kyc-webhook.controller.ts).
 */
export function mapDiditDecision(decision?: string): CercleKycStatus {
  if (decision === 'Approved') return 'VERIFIED';
  if (decision === 'Declined') return 'REJECTED';
  return 'PENDING';
}

/**
 * Applique une décision Didit de façon atomique (KYC + statut user).
 * Exportée car partagée entre le polling de secours de /kyc/me/status
 * (ce contrôleur) et le webhook public (kyc-webhook.controller.ts).
 */
export async function applyKycDecision(
  prisma: PrismaService,
  kycDocumentId: string,
  userId: string,
  mapped: CercleKycStatus,
  diditDecision?: string,
) {
  await prisma.$transaction(async (tx) => {
    await tx.kycDocument.update({
      where: { id: kycDocumentId },
      data: {
        status: mapped,
        diditDecision: diditDecision ?? null,
        verifiedAt: mapped === 'VERIFIED' ? new Date() : null,
      },
    });
    await tx.user.update({
      where: { id: userId },
      data: { kycStatus: mapped },
    });
  });
}

/**
 * Endpoints KYC authentifiés (JWT) pour l'app mobile.
 *
 * Le webhook Didit vit dans un contrôleur séparé
 * (kyc-webhook.controller.ts), volontairement SANS guard JWT : Didit
 * appelle ce callback sans token, et la vérification de signature
 * HMAC-SHA256 y suffit.
 */
@UseGuards(JwtAuthGuard)
@Controller('kyc')
export class KycController {
  private readonly logger = new Logger(KycController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly didit: DiditService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Crée une session Didit v3 pour l'utilisateur connecté et renvoie l'URL
   * du flux de vérification.
   *
   * `callbackUrl` (optionnel) : URL de retour après le flux Didit, fournie
   * par le mobile. Nécessaire car Expo Go ne peut pas ouvrir le schéma
   * personnalisé `cercle://` (seuls les schémas exp:// y fonctionnent) :
   * le client calcule son URL de retour (Linking.createURL) selon son
   * environnement — exp:// en Expo Go, cercle:// en build de dev/production.
   * Par défaut : MOBILE_SCHEME://kyc/return (build).
   */
  @Post('me/session')
  async createSession(
    @CurrentUser() user: JwtPayload,
    @Body() body: { vendorId?: string; callbackUrl?: string },
  ) {
    const mobileScheme = this.config.get<string>('MOBILE_SCHEME', 'cercle');
    const session = await this.didit.createSession({
      callbackUrl: body?.callbackUrl ?? `${mobileScheme}://kyc/return`,
      // ID utilisateur Cercle — vendor_data Didit (déduplication, entité).
      vendorId: body?.vendorId ?? user.sub,
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.kycDocument.create({
        data: {
          userId: user.sub,
          diditSessionId: session.sessionId,
          status: 'PENDING',
        },
      });
      await tx.user.update({
        where: { id: user.sub },
        data: { kycStatus: 'PENDING' },
      });
    });

    return { sessionUrl: session.sessionUrl };
  }

  /** Statut KYC courant — appelé par l'app mobile après le retour du callback. */
  @Get('me/status')
  async status(@CurrentUser() user: JwtPayload) {
    const kyc = await this.prisma.kycDocument.findFirst({
      where: { userId: user.sub },
      orderBy: { createdAt: 'desc' },
    });
    if (!kyc) {
      return { status: 'NONE' };
    }

    // Retour instantané : si le webhook n'est pas encore arrivé, on
    // interroge Didit pour fournir la décision en temps réel.
    if (kyc.status === 'PENDING' && kyc.diditSessionId) {
      try {
        const remote = await this.didit.getSessionDecision(kyc.diditSessionId);
        const mapped = mapDiditDecision(remote.status);
        if (mapped !== 'PENDING') {
          await applyKycDecision(this.prisma, kyc.id, kyc.userId, mapped, remote.status);
          return { status: mapped };
        }
      } catch (err) {
        this.logger.warn(`Polling Didit impossible : ${String(err)}`);
      }
    }
    return { status: kyc.status };
  }
}
