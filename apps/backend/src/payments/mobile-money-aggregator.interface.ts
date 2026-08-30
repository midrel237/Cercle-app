export interface InitiateChargeParams {
  provider: 'MTN_MOMO' | 'ORANGE_MONEY';
  phoneNumber: string;
  amount: number;
  reference: string;
}

export interface InitiateChargeResult {
  aggregatorTransactionId: string;
  status: 'pending' | 'confirmed' | 'failed';
}

/**
 * Abstraction au-dessus de l'agrégateur Mobile Money (CinetPay, Maviance...).
 * Option A du cahier des charges — la plateforme ne détient jamais les fonds :
 * elle demande à l'agrégateur d'initier un transfert entre comptes Mobile
 * Money des membres, et attend la confirmation par webhook.
 */
export interface MobileMoneyAggregator {
  initiateCharge(params: InitiateChargeParams): Promise<InitiateChargeResult>;
  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean;
}
