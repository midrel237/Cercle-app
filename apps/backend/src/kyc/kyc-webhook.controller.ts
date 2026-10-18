import {
  Controller,
  HttpCode,
  Logger,
  Post,
  RawBodyRequest,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'node:crypto';
import type { Request } from 'express';
import { PrismaService } from '../database/prisma.service';
import { DiditService } from './didit.service';
import { applyKycDecision, mapDiditDecision } from './kyc.controller';

/**
 * Webhook Didit — public SANS auth JWT (Didit ne possède pas nos jetons).
 * Sécurité assurée uniquement par la vérification de signature
 * HMAC-SHA256 de l'en-tête X-Signature contre le secret partagé.
 *
 * ⚠ Ne jamais ajouter @UseGuards(JwtAuthGuard) ici : ce contrôleur
 * recevrait un 401 en production et les décisions de vérification
 * ne seraient jamais appliquées (le polling de secours de
 * /kyc/me/status masquerait le bug en développement).
 */
@Controller('kyc/didit')
export class KycWebhookController {
  private readonly logger = new Logger(KycWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly didit: DiditService,
  ) {}

  @Post('webhook')
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
        await applyKycDecision(
          kyc.id,
          kyc.userId,
          mapped,
          event.data.decision,
        );
      }
    }

    return { received: true };
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
