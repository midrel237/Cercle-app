import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamilies, fontSizes, spacing } from '../theme';

/**
 * Composant temporaire utilisé le temps de l'étape "structure du projet".
 * Chaque écran de la maquette a une route dédiée ; le contenu détaillé
 * (fidèle à Cercle_maquettes_ecrans.html) sera implémenté écran par écran.
 */
export function ScreenPlaceholder({
  screenNumber,
  title,
  description,
}: {
  screenNumber: number;
  title: string;
  description?: string;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.badge}>Écran {screenNumber}</Text>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.creamLight,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  badge: {
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.xs,
    color: colors.navyLight,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fontFamilies.serif,
    fontSize: fontSizes.xl,
    color: colors.navyDark,
    textAlign: 'center',
  },
  description: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.base,
    color: colors.navyLight,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
