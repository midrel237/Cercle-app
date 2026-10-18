import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../src/components/AppButton';
import { colors, fonts, radii, spacing } from '../../src/theme';

/**
 * Écran 66 — Remboursement confirmé : montant transféré, échéances
 * restantes. Atteint après le polling de l'écran 33 (webhook confirmé →
 * échéance PAID côté serveur).
 */
export default function LoanRepaymentConfirmedScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { amount, loanId, remaining } = useLocalSearchParams<{
    amount?: string;
    loanId?: string;
    remaining?: string;
  }>();

  const amountNum = Number(amount ?? 0);
  const remainingNum = Number(remaining ?? 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.badge}>
          <Text style={styles.badgeIcon}>✓</Text>
        </View>
        <Text style={styles.title}>{t('loansScreen.repaymentConfirmedTitle')}</Text>
        <Text style={styles.subtitle}>
          {t('loansScreen.repaymentConfirmedSubtitle', {
            amount: amountNum.toLocaleString('fr-FR'),
            remaining: remainingNum,
          })}
        </Text>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <AppButton
          label={t('loansScreen.viewLoanButton')}
          onPress={() =>
            loanId
              ? router.replace(`/loan/${loanId}`)
              : router.replace('/(tabs)/loans')
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.creamLight },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  badge: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  badgeIcon: { fontSize: 32, color: colors.white, fontFamily: fonts.inter.bold },
  title: { fontFamily: fonts.fraunces.semiBold, fontSize: 22, color: colors.navyDark, marginBottom: spacing.sm, textAlign: 'center' },
  subtitle: { fontFamily: fonts.inter.regular, fontSize: 12.5, color: colors.inkSoft, textAlign: 'center', lineHeight: 18 },
  footer: { paddingHorizontal: spacing.md + 2 },
});
