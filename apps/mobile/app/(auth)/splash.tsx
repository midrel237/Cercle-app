import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { RotationMotif } from '../../src/components/RotationMotif';
import { colors, fonts, spacing } from '../../src/theme';

// Écran 1 — Splash (section Découverte)
// Identité de marque affichée le temps que l'app se prépare, puis
// redirection automatique vers le choix de la langue.
export default function SplashScreen() {
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(auth)/language');
    }, 1400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <RotationMotif size={84} activeIndex={0} />
      <Text style={styles.wordmark}>Cercle</Text>
      <View style={styles.bottom}>
        <ActivityIndicator color={colors.gold} style={{ marginBottom: spacing.sm }} />
        <Text style={styles.version}>v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontFamily: fonts.fraunces.semiBold,
    fontSize: 26,
    color: colors.white,
    marginTop: spacing.lg,
  },
  bottom: {
    position: 'absolute',
    bottom: 44,
    alignItems: 'center',
  },
  version: {
    fontFamily: fonts.mono.medium,
    fontSize: 10.5,
    color: colors.navySoft,
  },
});
