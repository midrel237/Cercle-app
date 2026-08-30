export type KycStatus = 'not_started' | 'pending' | 'verified' | 'rejected';

/** Devise pivot XAF (FCFA) ; les autres valeurs concernent les membres de
 * la diaspora cotisant depuis l'étranger. */
export type Currency = 'XAF' | 'EUR' | 'USD' | 'GBP' | 'CAD';

export interface User {
  id: string;
  phoneNumber: string; // format E.164, ex: +237690000000
  fullName: string;
  language: 'fr' | 'en';
  kycStatus: KycStatus;
  hasBiometricEnabled: boolean;
  trustScore: number; // score de confiance communautaire (0-100)
  countryOfResidence?: string; // ISO 3166-1 alpha-2, ex: "CM", "FR"
  preferredCurrency: Currency; // devise d'affichage (le ledger reste en XAF)
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
