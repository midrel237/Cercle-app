import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton } from '../../src/components/AppButton';
import { colors, fonts, radii, spacing } from '../../src/theme';

// Écran 14 — Identité vérifiée (décision Didit APPROVED).
// Le statut user.kycStatus est désormais VERIFIED côté backend (webhook
// ou polling de secours) ; le parcours se poursuit vers la sécurité du
// compte (écrans 16-20 : PIN, biométrie, notifications).
export default function KycSuccessScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.badgeEmoji}>✅</Text>
      </View>
      <Text style={styles.title}>{t('kyc.success.title')}</Text>
      <Text style={styles.subtitle}>{t('kyc.success.subtitle')}</Text>

      <View style={styles.footer}>
        <AppButton
          label={t('kyc.success.continueButton')}
          onPress={() => router.replace('/(onboarding)/create-pin')}
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
    borderColor: colors.goldDark,
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
  },
});
