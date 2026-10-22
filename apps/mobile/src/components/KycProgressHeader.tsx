import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { FadeIn } from './motion';
import { colors, fonts, radii, spacing } from '../theme';

interface Props {
  /** Ex. "Étape 2 sur 3" */
  stepLabel: string;
  /** Progression de 0 à 1 */
  progress: number;
  /** Par défaut : router.back(). À surcharger si l'écran a une logique de retour spécifique. */
  onBack?: () => void;
}

// Utilisé par tous les écrans du parcours KYC (6 à 15) pour garder un
// en-tête cohérent : bouton retour (positionné sous la zone sûre), libellé
// d'étape et barre de progression, fidèles à la maquette.
//
// Correctifs : la flèche est un tracé SVG et non le caractère ← (le glyphe
// U+2190 est absent des polices Inter/Fraunces et se rend en glyphe cassé
// « D » sur certains appareils Android) ; apparition animée en fondu de
// l'en-tête.
export function KycProgressHeader({ stepLabel, progress, onBack }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <FadeIn duration={300}>
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        <Pressable style={styles.backBtn} onPress={onBack ?? (() => router.back())} hitSlop={12}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 5l-7 7 7 7"
              stroke={colors.navyDark}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
        <Text style={styles.stepLabel}>{stepLabel}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      </View>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  backBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.sand,
    backgroundColor: colors.creamLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm + 2,
  },
  stepLabel: {
    fontFamily: fonts.mono.medium,
    fontSize: 11,
    color: colors.inkSoft,
    marginBottom: spacing.xs,
  },
  track: {
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.sand,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.goldDark,
  },
});
