import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton } from '../../src/components/AppButton';
import { KycProgressHeader } from '../../src/components/KycProgressHeader';
import { colors, fonts, radii, spacing } from '../../src/theme';

// Écran 19 — Autorisation des notifications push.
// Demande la permission système (iOS alerte native, Android 13+ runtime
// permission). L'utilisateur peut refuser sans bloquer l'onboarding : le
// récapitulatif de sécurité (écran 20) permet de la réactiver depuis les
// réglages système.
//
// IMPORTANT — import dynamique : Expo Go (SDK 53+) ne contient pas les
// modules natifs de push Android. Un import statique de 'expo-notifications'
// jette "Cannot find native module 'ExpoTopicSubscriptionModule'" dès
// l'évaluation du module de route, ce qui casse tout l'écran (warning
// "missing default export"). On charge donc la librairie uniquement au
// clic, dans un try/catch — en development build (expo-dev-client) la
// permission réelle s'applique, en Expo Go l'échec est silencieux.
export default function NotificationPermissionScreen() {
  const { t } = useTranslation();
  const [isRequesting, setIsRequesting] = useState(false);

  const handleAllow = async () => {
    setIsRequesting(true);
    try {
      try {
        const Notifications = await import('expo-notifications');
        await Notifications.requestPermissionsAsync();
      } catch {
        // Expo Go / environnement sans support push : permission ignorée.
      }
      router.replace('/(onboarding)/security');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSkip = () => {
    router.replace('/(onboarding)/security');
  };

  return (
    <View style={styles.container}>
      <KycProgressHeader stepLabel={t('onboarding.notifications.stepLabel')} progress={1} />

      <View style={styles.content}>
        <Text style={styles.emoji}>🔔</Text>
        <Text style={styles.title}>{t('onboarding.notifications.title')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.notifications.subtitle')}</Text>

        <View style={styles.card}>
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={styles.rowEmoji}>📅</Text>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{t('onboarding.notifications.row1Title')}</Text>
              <Text style={styles.rowHint}>{t('onboarding.notifications.row1Hint')}</Text>
            </View>
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={styles.rowEmoji}>💳</Text>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{t('onboarding.notifications.row2Title')}</Text>
              <Text style={styles.rowHint}>{t('onboarding.notifications.row2Hint')}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowEmoji}>🤝</Text>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{t('onboarding.notifications.row3Title')}</Text>
              <Text style={styles.rowHint}>{t('onboarding.notifications.row3Hint')}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <AppButton
          label={t('onboarding.notifications.allowButton')}
          onPress={handleAllow}
          disabled={isRequesting}
        />
        <AppButton
          label={t('onboarding.notifications.skipButton')}
          variant="ghost"
          style={styles.skipButton}
          onPress={handleSkip}
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
    gap: 10,
  },
  skipButton: {
    marginTop: 0,
  },
});
