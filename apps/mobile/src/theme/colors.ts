/**
 * Palette extraite de la maquette (Cercle_maquettes_ecrans.html).
 * "Cercle" = nom produit retenu pour la maquette (tontine digitalisée).
 */
export const colors = {
  // Neutres / fond
  white: '#FFFFFF',
  cream: '#FBF3E2',
  creamLight: '#FFFDF9',
  sand: '#E7E1D4',

  // Texte neutre — écrans à fond clair (KYC, groupes, prêts, paramètres...)
  ink: '#232323',
  inkSoft: '#6B6F80',

  // Bleu marine — couleur de marque principale
  navyDark: '#1B2340',
  navy: '#232C52',
  navyMedium: '#3A4372',
  navyLight: '#5A6394',
  navySoft: '#8A90B5',
  lavender: '#B9BFDA',
  lavenderSoft: '#E4E7F5',
  lavenderPale: '#EDEBF3',

  // Or / accent premium (cotisations, cagnotte)
  gold: '#E8C989',
  goldDark: '#C9962C',
  goldText: '#8A6A00',

  // États sémantiques
  success: '#2F8F5B',
  successSoft: '#E4F1E9',
  successPale: '#C9E6D4',
  warning: '#FFC107',
  warningSoft: '#FFF3D6',
  danger: '#C15B3D',
  dangerSoft: '#F7E6DF',
  orange: '#FF6600',
} as const;

export type ColorToken = keyof typeof colors;
