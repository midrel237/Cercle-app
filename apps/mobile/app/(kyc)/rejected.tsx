import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton } from '../../src/components/AppButton';
import { colors, fonts, radii, spacing } from '../../src/theme';

// Écran 15 — Vérification refusée (décision Didit DECLINED).
// L'identité n'a pas pu être validée cette fois : l'utilisateur peut
// relancer une nouvelle session de vérification depuis le choix du
// document (le backend crée un nouveau KycDocument à chaque session).
export default function KycRejectedScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.badgeEmoji}>⚠️</Text>
      </View>
      <Text style={styles.title}>{t('kyc.rejected.title')}</Text>
      <Text style={styles.subtitle}>{t('kyc.rejected.subtitle')}</Text>

      <View style={styles.footer}>
        <AppButton
          label={t('kyc.rejected.retryButton')}
          onPress={() => router.replace('/(kyc)/document-choice')}
        />
        <AppButton
          label={t('common.back')}
          variant="ghost"
          style={styles.secondaryButton}
          onPress={() => router.replace('/(kyc)/intro')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.creamLight,
    paddingHorizontal: spacing.md + 4,
  },
  badge: {
    width: 76,
    height: 76,
    borderRadius: radii.pill,
    backgroundColor: colors.cream,
    borderWidth: 1.5,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  badgeEmoji: {
    fontSize: 34,
  },
  title: {
    fontFamily: fonts.fraunces.semiBold,
    fontSize: 20,
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
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md + 2,
    paddingBottom: 20,
    paddingTop: spacing.sm,
    backgroundColor: colors.creamLight,
    gap: 10,
  },
  secondaryButton: {
    marginTop: 0,
  },
});
