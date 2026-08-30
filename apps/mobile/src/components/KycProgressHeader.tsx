import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
// en-tête cohérent : bouton retour (positionné sous la zone sûre, cf.
// correctif appliqué à welcome/otp/create-account/country-picker),
// libellé d'étape et barre de progression, fidèles à la maquette.
export function KycProgressHeader({ stepLabel, progress, onBack }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <Pressable
        style={styles.backBtn}
        onPress={onBack ?? (() => router.back())}
        hitSlop={12}
      >
        <Text style={styles.backIcon}>←</Text>
      </Pressable>
      <Text style={styles.stepLabel}>{stepLabel}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
    </View>
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
  backIcon: {
    fontSize: 15,
    color: colors.navyDark,
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
