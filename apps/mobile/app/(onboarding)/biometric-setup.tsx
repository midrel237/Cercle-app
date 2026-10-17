import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { AppButton } from '../../src/components/AppButton';
import { KycProgressHeader } from '../../src/components/KycProgressHeader';
import { colors, fonts, radii, spacing } from '../../src/theme';

export const BIOMETRIC_ENABLED_KEY = 'cercle_biometric_enabled';

// Écran 18 — Activation de la biométrie (empreinte / Face ID).
// Optionnel : l'utilisateur peut activer l'ouverture par biométrie au
// lieu de ressaisir son PIN à chaque session. La décision est purement
// locale (SecureStore) : le backend ne stocke aucune donnée biométrique,
// l'authentification elle-même est déléguée à l'OS via
// expo-local-authentication. Si aucun capteur n'est disponible sur
// l'appareil, l'écran informe simplement l'utilisateur.
export default function BiometricSetupScreen() {
  const { t } = useTranslation();
  const [hasHardware, setHasHardware] = useState<boolean | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [type, setType] = useState<LocalAuthentication.AuthenticationType>(
    LocalAuthentication.AuthenticationType.FINGERPRINT,
  );
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      const hardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = hardware ? await LocalAuthentication.isEnrolledAsync() : false;
      setHasHardware(hardware);
      setIsEnrolled(enrolled);
      if (enrolled) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.length > 0) {
          setType(types[0]);
        }
      }
      const stored = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      setEnabled(stored === 'true');
    })();
  }, []);

  const handleNext = () => {
    router.replace('/(onboarding)/notification-permission');
  };

  const toggle = async () => {
    const next = !enabled;
    setEnabled(next);
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, next ? 'true' : 'false');
  };

  // Appareil sans capteur biométrique (ou sans empreinte enregistrée) :
  // écran d'information sans action possible.
  if (hasHardware !== null && (!hasHardware || !isEnrolled)) {
    return (
      <View style={styles.container}>
        <KycProgressHeader stepLabel={t('onboarding.biometric.stepLabel')} progress={1} />
        <View style={styles.content}>
          <Text style={styles.emoji}>📱</Text>
          <Text style={styles.title}>{t('onboarding.biometric.unavailableTitle')}</Text>
          <Text style={styles.subtitle}>{t('onboarding.biometric.unavailableSubtitle')}</Text>
        </View>
        <View style={styles.footer}>
          <AppButton label={t('common.continue')} onPress={handleNext} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KycProgressHeader stepLabel={t('onboarding.biometric.stepLabel')} progress={1} />

      <View style={styles.content}>
        <Text style={styles.emoji}>
          {type === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION ? '😊' : '👆'}
        </Text>
        <Text style={styles.title}>{t('onboarding.biometric.title')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.biometric.subtitle')}</Text>

        <Pressable style={styles.card} onPress={toggle}>
          <View style={styles.cardText}>
            <Text style={styles.cardLabel}>
              {type === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
                ? t('onboarding.biometric.faceIdLabel')
                : t('onboarding.biometric.fingerprintLabel')}
            </Text>
            <Text style={styles.cardHint}>{t('onboarding.biometric.hint')}</Text>
          </View>
          <View style={[styles.switch, enabled && styles.switchOn]}>
            <View style={[styles.switchKnob, enabled && styles.switchKnobOn]} />
          </View>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <AppButton label={t('common.continue')} onPress={handleNext} />
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
    paddingHorizontal: spacing.xl,
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
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.sand,
    borderRadius: radii.md,
    padding: 14,
    backgroundColor: colors.creamLight,
    gap: spacing.sm,
  },
  cardText: {
    flex: 1,
  },
  cardLabel: {
    fontFamily: fonts.inter.medium,
    fontSize: 12.5,
    color: colors.navyDark,
  },
  cardHint: {
    fontFamily: fonts.inter.regular,
    fontSize: 10.5,
    color: colors.inkSoft,
    marginTop: 1,
  },
  switch: {
    width: 42,
    height: 24,
    borderRadius: radii.pill,
    backgroundColor: colors.sand,
    padding: 2,
    justifyContent: 'center',
  },
  switchOn: {
    backgroundColor: colors.goldDark,
  },
  switchKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.creamLight,
  },
  switchKnobOn: {
    transform: [{ translateX: 18 }],
  },
  footer: {
    paddingHorizontal: spacing.md + 2,
    paddingBottom: 20,
    paddingTop: spacing.sm,
    backgroundColor: colors.creamLight,
  },
});
