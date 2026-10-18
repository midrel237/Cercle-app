import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../src/components/AppButton';
import { colors, fonts, radii, spacing } from '../../src/theme';

/**
 * Écran 28 — Demande d'adhésion envoyée. Reçoit le nom du groupe en
 * paramètre de navigation depuis l'écran 27 ; statut PENDING côté backend
 * (GroupMember.joinStatus), validé par l'admin via join-decision.
 */
export default function JoinPendingScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { groupName } = useLocalSearchParams<{ groupName?: string }>();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Text style={styles.emoji}>⏳</Text>
        <Text style={styles.title}>{t('joinPending.title')}</Text>
        <Text style={styles.subtitle}>
          {t('joinPending.subtitle', { group: groupName ?? '' })}
        </Text>

        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>{t('joinPending.statusLabel')}</Text>
            <Text style={styles.statusValue}>{t('joinPending.statusPending')}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <AppButton label={t('joinPending.homeButton')} onPress={() => router.replace('/(tabs)')} variant="dark" />
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
    fontSize: 42,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.fraunces.semiBold,
    fontSize: 22,
    color: colors.navyDark,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.inter.regular,
    fontSize: 13,
    color: colors.inkSoft,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.xl,
  },
  statusCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.sand,
    borderRadius: radii.md,
    backgroundColor: colors.creamLight,
    paddingHorizontal: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
  },
  statusLabel: {
    fontFamily: fonts.inter.regular,
    fontSize: 12.5,
    color: colors.inkSoft,
  },
  statusValue: {
    fontFamily: fonts.inter.semiBold,
    fontSize: 12.5,
    color: colors.goldDark,
  },
  footer: {
    paddingHorizontal: spacing.md + 2,
  },
});
