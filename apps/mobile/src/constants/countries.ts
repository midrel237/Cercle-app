export interface Country {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  flag: string;
  dialCode: string;
}

// Cameroun en tête : marché principal du produit (cf. cahier des charges).
export const DEFAULT_COUNTRY: Country = {
  code: 'CM',
  name: 'Cameroun',
  flag: '🇨🇲',
  dialCode: '+237',
};

export const DIASPORA_COUNTRIES: Country[] = [
  { code: 'FR', name: 'France', flag: '🇫🇷', dialCode: '+33' },
  { code: 'BE', name: 'Belgique', flag: '🇧🇪', dialCode: '+32' },
  { code: 'DE', name: 'Allemagne', flag: '🇩🇪', dialCode: '+49' },
  { code: 'GB', name: 'Royaume-Uni', flag: '🇬🇧', dialCode: '+44' },
  { code: 'US', name: 'États-Unis', flag: '🇺🇸', dialCode: '+1' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', dialCode: '+1' },
];

export const REGIONAL_COUNTRIES: Country[] = [
  { code: 'GA', name: 'Gabon', flag: '🇬🇦', dialCode: '+241' },
  { code: 'TD', name: 'Tchad', flag: '🇹🇩', dialCode: '+235' },
  { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮', dialCode: '+225' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', dialCode: '+234' },
];

export const ALL_COUNTRIES: Country[] = [
  DEFAULT_COUNTRY,
  ...DIASPORA_COUNTRIES,
  ...REGIONAL_COUNTRIES,
];
