import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Wrapper isolé de l'API Didit (api.didit.com v2).
 * Tous les détails du fournisseur (base URL, auth, signature) sont
 * centralisés ici pour pouvoir les vérifier/ajuster en un seul endroit
 * une fois les identifiants réels branchés (developers.didit.com).
 */
@Injectable()
export class DiditService {
  private readonly logger = new Logger(DiditService.name);
  private readonly baseUrl = 'https://didit.app/api/v2';
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(private readonly config: ConfigService) {}

  get clientId(): string {
    return this.config.get<string>('DIDIT_CLIENT_ID', '');
  }

  get clientSecret(): string {
    return this.config.get<string>('DIDIT_CLIENT_SECRET', '');
  }

  get webhookSecret(): string {
    return this.config.get<string>('DIDIT_WEBHOOK_SECRET', '');
  }

  /**
   * Authentification OAuth2 client_credentials — Didit renvoie un token
   * porteur avec une durée de validité (expires_in).
   */
  private async getAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (this.tokenCache && this.tokenCache.expiresAt > now + 60) {
      return this.tokenCache.token;
    }

    const res = await fetch(`${this.baseUrl}/auth/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!res.ok) {
      throw new Error(`Didit auth échouée: ${res.status}`);
    }

    const body = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };
    this.tokenCache = {
      token: body.access_token,
      expiresAt: now + body.expires_in,
    };
    return body.access_token;
  }

  /**
   * Crée une session de vérification d'identité hébergée.
   * L'utilisateur finalise la vérification dans le flux Didit
   * (web / mobile SDK), puis revient dans l'app via le deep link.
   */
  async createSession(params: {
    callbackUrl: string;
    vendorId?: string;
    redirectUrl: string;
  }): Promise<{ sessionId: string; sessionUrl: string }> {
    const token = await this.getAccessToken();

    const res = await fetch(`${this.baseUrl}/sessions/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      this.logger.error(`Didit createSession échec: ${res.status}`);
      throw new Error(`Didit createSession échec: ${res.status}`);
    }

    const body = (await res.json()) as {
      id: string;
      url: string;
    };
    return { sessionId: body.id, sessionUrl: body.url };
  }

  /**
   * Récupère l'état d'une session Didit (pour le polling de secours si
   * le webhook n'est pas encore arrivé lors du retour du deep link).
   * Cartographie statuts Didit → Cercle:
   *   PENDING  → PENDING
   *   APPROVED → VERIFIED
   *   DECLINED → REJECTED
   */
  async getSession(sessionId: string): Promise<{ status: string }> {
    const token = await this.getAccessToken();

    const res = await fetch(`${this.baseUrl}/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(`Didit getSession échec: ${res.status}`);
    }

    const body = (await res.json()) as { status: string };
    return { status: body.status };
  }
}
