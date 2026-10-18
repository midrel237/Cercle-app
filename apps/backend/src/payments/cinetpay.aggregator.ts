import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  InitiateChargeParams,
  InitiateChargeResult,
  MobileMoneyAggregator,
} from './mobile-money-aggregator.interface';

/**
 * Agrégateur CinetPay réel (API Checkout v2).
 *
 * Sécurité :
 * - Clé API et secret HMAC depuis les variables d'environnement (jamais en dur).
 * - Le webhook est vérifié par HMAC-SHA256 du corps brut (x-token).
 * - Aucun code secret opérateur ne transite par Cercle : la plateforme
 *   initie la collecte et attend la confirmation par webhook (Option A, §7).
 *
 * Env requise (.env) :
 *   CINETPAY_API_KEY=…            (clé API merchant)
 *   CINETPAY_SECRET_KEY=…         (secret de vérification webhook)
 *   CINETPAY_BASE_URL=https://api-checkout.cinetpay.com   (optionnel)
 *   CINETPAY_NOTIFY_URL=https://…/api/v1/payments/webhook (URL publique)
 *   CINETPAY_SITE_ID=…            (identifiant site CinetPay)
 */
@Injectable()
export class CinetPayAggregator implements MobileMoneyAggregator {
  private readonly logger = new Logger(CinetPayAggregator.name);

  constructor(private readonly config: ConfigService) {}

  private get apiKey(): string {
    const key = this.config.get<string>('CINETPAY_API_KEY');
    if (!key) throw new Error('CINETPAY_API_KEY manquante.');
    return key;
  }

  private get baseUrl(): string {
    return this.config.get<string>('CINETPAY_BASE_URL') ?? 'https://api-checkout.cinetpay.com';
  }

  /**
   * Initie une collecte Mobile Money (MTN MoMo / Orange Money Cameroun).
   * Renvoie l'identifiant de collecte opérateur que le webhook confirmera.
   */
  async initiateCharge(params: InitiateChargeParams): Promise<InitiateChargeResult> {
    const notifyUrl = this.config.get<string>('CINETPAY_NOTIFY_URL');
    const siteId = this.config.get<string>('CINETPAY_SITE_ID');
    if (!notifyUrl || !siteId) {
      throw new Error('CINETPAY_NOTIFY_URL / CINETPAY_SITE_ID manquantes.');
    }

    // L'API Checkout exige un transaction_id unique <= 64 caractères.
    const transactionId = params.reference.slice(0, 64);

    const body = {
      apikey: this.apiKey,
      site_id: siteId,
      transaction_id: transactionId,
      amount: Math.round(params.amount),
      currency: 'XAF',
      channels: 'MOBILE_MONEY',
      description: 'Cotisation Cercle',
      customer_phone_number: params.phoneNumber.replace(/[^0-9+]/g, ''),
      notify_url: notifyUrl,
      return_url: notifyUrl,
      lang: 'fr',
      metadata: JSON.stringify({ provider: params.provider, app: 'cercle' }),
    };

    const res = await fetch(`${this.baseUrl}/v2/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      this.logger.error(`CinetPay initiate HTTP ${res.status}`);
      throw new Error(`CinetPay indisponible (${res.status}).`);
    }

    const json = (await res.json()) as {
      code?: string;
      message?: string;
      data?: { payment_token?: string };
    };

    // code 201 = paiement créé avec succès côté CinetPay.
    if (json.code !== '201' || !json.data?.payment_token) {
      this.logger.warn(`CinetPay refuse la collecte: ${json.code} ${json.message}`);
      throw new Error(json.message ?? 'Collecte refusee par l operateur.');
    }

    return {
      aggregatorTransactionId: json.data.payment_token,
      status: 'pending',
    };
  }

  /**
   * Vérifie la signature du webhook : HMAC-SHA256 du corps brut avec le
   * secret, comparé à l'en-tête fourni (comparaison temps constant).
   */
  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    const secret = this.config.get<string>('CINETPAY_SECRET_KEY');
    if (!secret || !signatureHeader) return false;

    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('hex');

    const a = Buffer.from(expected);
    const b = Buffer.from(signatureHeader);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
}
