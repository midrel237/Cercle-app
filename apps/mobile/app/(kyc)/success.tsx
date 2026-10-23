import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton } from '../../src/components/AppButton';
import { PopIn } from '../../src/components/motion';
import { colors, fonts, radii, spacing } from '../../src/theme';

// Écran 14 — Identité vérifiée (décision Didit APPROVED).
// Conforme à la maquette : badge « Certifié », date « Vérifié le {date} »
// (transmise par l'écran 13 depuis GET /kyc/me/status.verifiedAt), puis
// « Continuer » vers la création du PIN (écrans 16-20).
//
// Correctif : l'emoji ✅ (badge) se rendait en rectangle cassé sur certains
// appareils — remplacé par un badge dessiné (cercle or + coche ✓).
export default function KycSuccessScreen() {
  const { t } = useTranslation();
  const { verifiedAt } = useLocalSearchParams<{ verifiedAt?: string }>();

  const verifiedOn = verifiedAt
    ? new Date(verifiedAt).toLocaleDateString('fr-FR')
    : new Date().toLocaleDateString('fr-FR');

  return (
    <View style={styles.container}>
      <PopIn delay={100}>
        <View style={styles.badge}>
          <Text style={styles.badgeCheck}>✓</Text>
        </View>
      </PopIn>
      <Text style={styles.title}>{t('kyc.success.title')}</Text>
      <Text style={styles.subtitle}>{t('kyc.success.subtitle')}</Text>

      <View style={styles.certifiedCard}>
        <View style={styles.certifiedRow}>
          <Text style={styles.certifiedLabel}>{t('kyc.success.certifiedLabel')}</Text>
          <Text style={styles.certifiedValue}>{t('kyc.success.verifiedOnLabel', { date: verifiedOn })}</Text>
        </View>
      </View>

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
    backgroundColor: colors.goldDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  badgeCheck: {
    color: colors.white,
    fontSize: 36,
    fontFamily: fonts.inter.bold,
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
    marginBottom: spacing.lg,
  },
  certifiedCard: {
    borderWidth: 1.5,
    borderColor: colors.goldDark,
    borderRadius: radii.md,
    backgroundColor: colors.cream,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.lg,
  },
  certifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  certifiedLabel: {
    fontFamily: fonts.inter.bold,
    fontSize: 12,
    color: colors.navyDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  certifiedValue: {
    fontFamily: fonts.mono.medium,
    fontSize: 12,
    color: colors.inkSoft,
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
