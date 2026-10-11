import {
  Body,
  Controller,
  Get,
  HttpCode,
  Logger,
  Post,
  RawBodyRequest,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';
import type { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../database/prisma.service';
import { DiditService } from './didit.service';

/** Statuts métier Cercle mappés depuis la décision Didit. */
type CercleKycStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

function mapDiditDecision(decision?: string): CercleKycStatus {
  if (decision === 'APPROVED') return 'VERIFIED';
  if (decision === 'DECLINED') return 'REJECTED';
  return 'PENDING';
}

/**
 * Webhook Didit signé — public (sans auth JWT) mais protégé par
 * vérification de signature HMAC-SHA256 (en-tête X-Signature).
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
   * Crée une session Didit pour l'utilisateur connecté et renvoie l'URL
   * du flux de vérification. L'app mobile ouvre sessionUrl via
   * expo-web-browser et revient via `cercle://kyc/return`.
   */
  @Post('me/session')
  async createSession(
    @CurrentUser() user: JwtPayload,
    @Body() body: { vendorId?: string },
  ) {
    const mobileScheme = this.config.get<string>('MOBILE_SCHEME', 'cercle');
    const session = await this.didit.createSession({
      callbackUrl: `${mobileScheme}://kyc/return`,
      vendorId: body?.vendorId,
      redirectUrl: `${mobileScheme}://kyc/return`,
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

  /** Statut KYC courant — appelé par l'app mobile après le retour deep link. */
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
        const remote = await this.didit.getSession(kyc.diditSessionId);
        const mapped = mapDiditDecision(remote.status);
        if (mapped !== 'PENDING') {
          await this.applyDecision(kyc.id, kyc.userId, mapped, remote.status);
          return { status: mapped };
        }
      } catch (err) {
        this.logger.warn(`Polling Didit impossible : ${String(err)}`);
      }
    }
    return { status: kyc.status };
  }

  /** Endpoint public du webhook Didit (signature vérifiée). */
  @Post('didit/webhook')
  @HttpCode(200)
  async webhook(@Req() req: RawBodyRequest<Request>) {
    if (!req.rawBody) {
      throw new UnauthorizedException('Corps brut indisponible.');
    }
    const raw = req.rawBody.toString('utf8');
    const signature = String(req.headers['x-signature'] ?? '');
    this.verifySignature(raw, signature);

    const event = JSON.parse(raw) as {
      type?: string;
      data?: { id?: string; decision?: string };
    };
    this.logger.log(`Didit webhook : ${event.type}`);

    if (event.type === 'session.completed' && event.data?.id) {
      const mapped = mapDiditDecision(event.data.decision);
      const kyc = await this.prisma.kycDocument.findFirst({
        where: { diditSessionId: event.data.id },
      });
      if (kyc) {
        await this.applyDecision(
          kyc.id,
          kyc.userId,
          mapped,
          event.data.decision,
        );
      }
    }

    return { received: true };
  }

  /** Applique une décision Didit de façon atomique (KYC + statut user). */
  private async applyDecision(
    kycDocumentId: string,
    userId: string,
    mapped: CercleKycStatus,
    diditDecision?: string,
  ) {
    await this.prisma.$transaction(async (tx) => {
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
   * Vérifie la signature HMAC-SHA256 du webhook avec le secret partagé.
   * Comparaison en longueur constante (timingSafeEqual).
   */
  private verifySignature(raw: string, signature: string) {
    const secret = this.didit.webhookSecret;
    if (!secret) {
      throw new UnauthorizedException('Webhook Didit non configuré.');
    }
    const trimmed = signature.trim();
    const expected = crypto
      .createHmac('sha256', secret)
      .update(raw)
      .digest('hex');
    const a = Buffer.from(expected, 'utf8');
    const b =
      trimmed.length === expected.length
        ? Buffer.from(trimmed, 'utf8')
        : Buffer.alloc(expected.length);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Signature Didit invalide.');
    }
  }
}
