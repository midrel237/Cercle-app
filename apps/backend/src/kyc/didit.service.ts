import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Wrapper isolé de l'API Didit v3 (verification.didit.me).
 * Tous les détails du fournisseur (base URL, auth, statuts) sont
 * centralisés ici pour pouvoir les vérifier/ajuster en un seul endroit
 * (docs.didit.me).
 *
 * Migration v2 -> v3 (l'ancienne base didit.app/api/v2 a été retirée —
 * les appels renvoyaient 404) :
 * - Auth : plus de flux OAuth client_credentials ; une simple clé
 *   d'application dans l'en-tête x-api-key (DIDIT_API_KEY).
 * - Création : POST /v3/session/ avec workflow_id obligatoire (UUID du
 *   workflow publié dans la Console Didit) + callback + vendor_data
 *   (ID utilisateur Cercle — lie la session à l'utilisateur et permet
 *   la détection de doublons côté Didit).
 * - Lecture : GET /v3/session/{id}/decision/ — statuts exacts
 *   "Approved" / "Declined" / "In Review" (casse sensible).
 */
@Injectable()
export class DiditService {
  private readonly logger = new Logger(DiditService.name);
  private readonly baseUrl = 'https://verification.didit.me';

  constructor(private readonly config: ConfigService) {}

  get apiKey(): string {
    return this.config.get<string>('DIDIT_API_KEY', '');
  }

  get workflowId(): string {
    return this.config.get<string>('DIDIT_WORKFLOW_ID', '');
  }

  get webhookSecret(): string {
    return this.config.get<string>('DIDIT_WEBHOOK_SECRET', '');
  }

  private authHeaders(): Record<string, string> {
    return {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Crée une session de vérification d'identité hébergée (v3).
   * L'utilisateur finalise la vérification dans le flux Didit, puis revient
   * dans l'app via le callback cercle://kyc/return (Didit y ajoute
   * ?verificationSessionId={session_id}&status={status}).
   */
  async createSession(params: {
    callbackUrl: string;
    vendorId?: string;
    language?: string;
  }): Promise<{ sessionId: string; sessionUrl: string }> {
    const body: Record<string, unknown> = {
      workflow_id: this.workflowId,
      callback: params.callbackUrl,
      language: params.language ?? 'fr',
    };
    if (!this.workflowId) {
      throw new Error(
        'DIDIT_WORKFLOW_ID manquant : créez et publiez un workflow KYC dans la Console Didit.',
      );
    }
    if (params.vendorId) {
      // Identifiant stable de l'utilisateur Cercle — recommandé par Didit
      // (déduplication des sessions, lien avec l'entité User).
      body.vendor_data = params.vendorId;
    }

    const res = await fetch(`${this.baseUrl}/v3/session/`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      this.logger.error(`Didit createSession échec: ${res.status} ${detail.slice(0, 300)}`);
      throw new Error(`Didit createSession échec: ${res.status}`);
    }

    const parsed = (await res.json()) as {
      id?: string;
      session_id?: string;
      url?: string;
    };
    const sessionId = parsed.id ?? parsed.session_id;
    if (!sessionId || !parsed.url) {
      throw new Error('Didit createSession : réponse inattendue (id/url absents).');
    }
    return { sessionId, sessionUrl: parsed.url };
  }

  /**
   * Récupère la décision d'une session Didit (polling de secours si le
   * webhook n'est pas encore arrivé lors du retour du callback).
   * Statuts Didit v3 (casse exacte) :
   *   "Not Started" / "In Progress" / "Awaiting User" / "Resubmitted" -> PENDING
   *   "Approved"  -> VERIFIED
   *   "Declined"  -> REJECTED
   *   "In Review" -> reste PENDING (décision humaine en cours)
   */
  async getSessionDecision(
    sessionId: string,
  ): Promise<{ status: string; decision?: unknown }> {
    const res = await fetch(
      `${this.baseUrl}/v3/session/${sessionId}/decision/`,
      { headers: this.authHeaders() },
    );

    if (!res.ok) {
      throw new Error(`Didit getSession échec: ${res.status}`);
    }

    const body = (await res.json()) as { status?: string; decision?: unknown };
    return { status: body.status ?? '', decision: body.decision };
  }
}
