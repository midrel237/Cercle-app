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
 * Webhook Didit v3 — public SANS auth JWT (Didit ne possède pas nos jetons).
 * Sécurité assurée par la vérification de signature HMAC-SHA256 de l'en-tête
 * X-Signature contre le secret partagé, plus la fraîcheur X-Timestamp.
 *
 * ⚠ Ne jamais ajouter @UseGuards(JwtAuthGuard) ici : ce contrôleur
 * recevrait un 401 en production et les décisions de vérification
 * ne seraient jamais appliquées.
 *
 * Enveloppe v3 (docs.didit.me/integration/webhooks) :
 * {
 *   "event_id": "...", "session_id": "...",
 *   "status": "Approved" | "Declined" | ...,
 *   "webhook_type": "status.updated",
 *   "vendor_data": "...", "environment": "live" | "sandbox",
 *   ...
 * }
 * L'événement pertinent est "status.updated" avec session_id + status à la
 * racine (l'ancien "session.completed" avec data.id/data.decision était v2).
 */
@Controller('kyc/didit')
export class KycWebhookController {
  private readonly logger = new Logger(KycWebhookController.name);

  /** Tolérance de fraîcheur du timestamp Didit (docs : 5 minutes). */
  private static readonly MAX_TIMESTAMP_SKEW = 300;

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
    this.verifyTimestamp(req.headers['x-timestamp']);

    const event = JSON.parse(raw) as {
      webhook_type?: string;
      session_id?: string;
      status?: string;
      environment?: string;
    };
    this.logger.log(
      `Didit webhook : ${event.webhook_type} / ${event.status} (${event.environment ?? '?'})`,
    );

    if (event.webhook_type === 'status.updated' && event.session_id && event.status) {
      const mapped = mapDiditDecision(event.status);
      if (mapped === 'PENDING') {
        // Statut intermédiaire (In Progress, In Review...) : rien à faire,
        // on attend la décision finale. On répond 200 pour que Didit
        // cesse les tentatives de relance.
        this.logger.log(`Didit webhook : statut intermédiaire « ${event.status} » ignoré.`);
        return { received: true };
      }

      const kyc = await this.prisma.kycDocument.findFirst({
        where: { diditSessionId: event.session_id },
      });
      if (kyc) {
        await applyKycDecision(this.prisma, kyc.id, kyc.userId, mapped, event.status);
      } else {
        // Session inconnue (autre environnement, données purgées) : on
        // journalise sans échouer — un 500 déclencherait inutilement les
        // relances de Didit.
        this.logger.warn(`Didit webhook : session inconnue ${event.session_id}`);
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

  /**
   * Fraîcheur de l'enveloppe : rejette les webhooks rejoués au-delà de la
   * fenêtre de tolérance (docs Didit : abs(now - X-Timestamp) <= 300 s).
   * Absent ou invalide => refus (l'en-tête est toujours envoyé en v3).
   */
  private verifyTimestamp(rawTimestamp: unknown) {
    const ts = Number(rawTimestamp);
    if (!Number.isFinite(ts) || ts <= 0) {
      throw new UnauthorizedException('Timestamp Didit absent ou invalide.');
    }
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - ts) > KycWebhookController.MAX_TIMESTAMP_SKEW) {
      throw new UnauthorizedException('Timestamp Didit trop ancien (rejeu ?).');
    }
  }
}
