import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as SecureStore from 'expo-secure-store';
import { AppButton } from '../../src/components/AppButton';
import { KycProgressHeader } from '../../src/components/KycProgressHeader';
import { BIOMETRIC_ENABLED_KEY } from './biometric-setup';
import { colors, fonts, radii, spacing } from '../../src/theme';

// Écran 20 — Récapitulatif de sécurité.
// Clôture de l'onboarding : identité vérifiée (KYC Didit), code PIN défini
// (user.pinHash côté backend), biométrie optionnelle (SecureStore local).
// Le bouton final fait entrer l'utilisateur dans l'app — il n'y a rien
// à envoyer au serveur ici, la session JWT est déjà ouverte.
export default function SecurityScreen() {
  const { t } = useTranslation();
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      setBiometricEnabled(stored === 'true');
    })();
  }, []);

  return (
    <View style={styles.container}>
      <KycProgressHeader stepLabel={t('onboarding.security.stepLabel')} progress={1} />

      <View style={styles.content}>
        <Text style={styles.emoji}>🛡️</Text>
        <Text style={styles.title}>{t('onboarding.security.title')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.security.subtitle')}</Text>

        <View style={styles.card}>
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={styles.rowEmoji}>✅</Text>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{t('onboarding.security.rowKycLabel')}</Text>
              <Text style={styles.rowHint}>{t('onboarding.security.rowKycHint')}</Text>
            </View>
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={styles.rowEmoji}>🔑</Text>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{t('onboarding.security.rowPinLabel')}</Text>
              <Text style={styles.rowHint}>{t('onboarding.security.rowPinHint')}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowEmoji}>{biometricEnabled ? '😊' : '📱'}</Text>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{t('onboarding.security.rowBiometricLabel')}</Text>
              <Text style={styles.rowHint}>
                {biometricEnabled
                  ? t('onboarding.security.rowBiometricHintOn')
                  : t('onboarding.security.rowBiometricHintOff')}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <AppButton
          label={t('onboarding.security.startButton')}
          onPress={() => router.replace('/(tabs)')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.creamLight,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md + 4,
  },
  emoji: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.fraunces.semiBold,
    fontSize: 19,
    color: colors.navyDark,
    marginBottom: spacing.xs + 2,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.inter.regular,
    fontSize: 12,
    color: colors.inkSoft,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  card: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.sand,
    borderRadius: radii.md,
    backgroundColor: colors.creamLight,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 10,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.sand,
  },
  rowEmoji: {
    fontSize: 18,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: fonts.inter.medium,
    fontSize: 12.5,
    color: colors.navyDark,
  },
  rowHint: {
    fontFamily: fonts.inter.regular,
    fontSize: 10.5,
    color: colors.inkSoft,
    marginTop: 1,
  },
  footer: {
    paddingHorizontal: spacing.md + 2,
    paddingBottom: 20,
    paddingTop: spacing.sm,
    backgroundColor: colors.creamLight,
  },
});
