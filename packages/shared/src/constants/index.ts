export const SUPPORTED_LANGUAGES = ['fr', 'en'] as const;

export const MOBILE_MONEY_PROVIDERS = ['mtn_momo', 'orange_money'] as const;

// Option A du cahier des charges : facilitateur technique.
// La plateforme ne détient jamais les fonds ; elle orchestre les paiements
// Mobile Money entre comptes des membres via l'agrégateur.
export const REGULATORY_MODE = 'facilitator_only' as const;

export const DEFAULT_KYC_REQUIRED_FOR_LOAN = true;

export const GROUP_EVENT_TYPES = [
  'deuil',
  'anniversaire',
  'naissance',
  'mariage',
  'maladie',
  'autre',
] as const;

export const GROUP_EVENT_TYPE_LABELS_FR: Record<(typeof GROUP_EVENT_TYPES)[number], string> = {
  deuil: 'Deuil',
  anniversaire: 'Anniversaire',
  naissance: 'Naissance',
  mariage: 'Mariage',
  maladie: 'Maladie',
  autre: 'Autre',
};
