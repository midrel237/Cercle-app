/**
 * Polices de la maquette :
 * - Fraunces (serif) : titres, montants mis en avant
 * - Inter (sans-serif) : texte courant, UI
 * - IBM Plex Mono (mono) : montants/chiffres tabulaires, codes (OTP, invitation)
 *
 * Chargées via @expo-google-fonts/* dans app/_layout.tsx (useFonts). React
 * Native exige le nom exact de la variante chargée (pas de synthèse bold
 * fiable) : on exporte donc les noms précis à utiliser dans les styles,
 * plutôt qu'un nom de famille générique.
 */
export const fonts = {
  fraunces: {
    regular: 'Fraunces_400Regular',
    medium: 'Fraunces_500Medium',
    semiBold: 'Fraunces_600SemiBold',
  },
  inter: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
  mono: {
    medium: 'IBMPlexMono_500Medium',
    semiBold: 'IBMPlexMono_600SemiBold',
  },
} as const;

// Compat rétro (ScreenPlaceholder) — à retirer une fois tous les écrans migrés.
export const fontFamilies = {
  serif: fonts.fraunces.semiBold,
  sans: fonts.inter.regular,
  mono: fonts.mono.medium,
} as const;

export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  md: 18,
  lg: 22,
  xl: 28,
  xxl: 34,
} as const;
