import { Injectable } from '@nestjs/common';
import {
  InitiateChargeParams,
  InitiateChargeResult,
  MobileMoneyAggregator,
} from './mobile-money-aggregator.interface';

/**
 * Implémentation de référence pour l'agrégateur CinetPay (à ajuster selon
 * la doc officielle et le contrat commercial retenu — voir §13 "Prochaines
 * étapes immédiates" du cahier des charges : comparatif CinetPay / Maviance).
 */
@Injectable()
export class CinetPayAggregator implements MobileMoneyAggregator {
  async initiateCharge(params: InitiateChargeParams): Promise<InitiateChargeResult> {
    // TODO: appel HTTP réel vers l'API CinetPay avec
    // process.env.MOMO_AGGREGATOR_BASE_URL / API_KEY / API_SECRET.
    return {
      aggregatorTransactionId: `cinetpay_${Date.now()}`,
      status: 'pending',
    };
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    // TODO: vérifier le HMAC/signature selon la doc CinetPay avant de faire
    // confiance à un webhook entrant.
    return Boolean(signatureHeader);
  }
}
