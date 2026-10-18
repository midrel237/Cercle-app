import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../../src/components/AppButton';
import { loansApi } from '../../../src/services/endpoints/loans';
import { paymentsApi, MobileMoneyProvider } from '../../../src/services/endpoints/payments';
import { colors, fonts, radii, spacing } from '../../../src/theme';

/**
 * Écran 65 — Rembourser une échéance : montant, échéance concernée, moyen
 * de paiement (MTN MoMo par défaut). POST /loans/:id/repay crée la
 * transaction LOAN_REPAYMENT PENDING puis initiate → écran 33 (polling),
 * → confirmation webhook → échéance PAID (écran 66).
 */
export default function LoanRepayScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id, installment, amount } = useLocalSearchParams<{
    id: string;
    installment: string;
    amount: string;
  }>();

  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountNum = Number(amount ?? 0);

  const handleRepay = async () => {
    if (!id || !installment || paying) return;
    setPaying(true);
    setError(null);
    try {
      // 1. Transaction LOAN_REPAYMENT PENDING (montant de l'échéance).
      const { data: transaction } = await loansApi.prepareRepayment(id, Number(installment));
      if (!transaction?.id) throw new Error('no transaction');

      // 2. Collecte Mobile Money → écran 33 (polling webhook).
      const provider: MobileMoneyProvider = 'MTN_MOMO';
      await paymentsApi.initiate(transaction.id, provider, amountNum);

      router.replace({
        pathname: '/payment/processing',
        params: {
          transactionId: transaction.id,
          amount: String(amountNum),
          provider,
          groupId: transaction.groupId ?? '',
          loanId: id,
        },
      });
    } catch {
      setError(t('loansScreen.repayError'));
      setPaying(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Text style={styles.title}>
          {t('loansScreen.repayTitle', { number: installment ?? '' })}
        </Text>

        <View style={styles.potCard}>
          <Text style={styles.potLabel}>{t('loansScreen.installmentAmountTitle')}</Text>
          <Text style={styles.potValue}>{amountNum.toLocaleString('fr-FR')} FCFA</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>{t('loansScreen.repayLoanRef')}</Text>
            <Text style={styles.cardValue}>{(id ?? '').slice(0, 8).toUpperCase()}</Text>
          </View>
          <View style={[styles.cardRow, styles.cardRowBorder]}>
            <Text style={styles.cardLabel}>{t('loansScreen.repayMethodLabel')}</Text>
            <Text style={styles.cardValue}>{t('loansScreen.repayMethodMomo')}</Text>
          </View>
        </View>

        {paying ? (
          <ActivityIndicator size="large" color={colors.goldDark} style={styles.spinner} />
        ) : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <AppButton
          label={t('loansScreen.repayConfirmButton', { amount: amountNum.toLocaleString('fr-FR') })}
          onPress={handleRepay}
          disabled={paying}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.creamLight },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  title: { fontFamily: fonts.fraunces.semiBold, fontSize: 22, color: colors.navyDark, marginBottom: spacing.lg, textAlign: 'center' },
  potCard: {
    borderWidth: 1.5, borderColor: colors.goldDark, borderRadius: radii.md,
    backgroundColor: colors.cream, padding: spacing.md, alignItems: 'center', marginBottom: spacing.lg, width: '100%',
  },
  potLabel: { fontFamily: fonts.inter.medium, fontSize: 10.5, color: colors.goldDark, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  potValue: { fontFamily: fonts.mono.semiBold, fontSize: 24, color: colors.navyDark },
  card: {
    width: '100%', borderWidth: 1, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm + 2 },
  cardRowBorder: { borderTopWidth: 1, borderTopColor: colors.sand },
  cardLabel: { fontFamily: fonts.inter.regular, fontSize: 12.5, color: colors.inkSoft },
  cardValue: { fontFamily: fonts.mono.medium, fontSize: 12.5, color: colors.navyDark },
  spinner: { marginTop: spacing.md },
  errorText: { fontFamily: fonts.inter.medium, fontSize: 11.5, color: colors.danger, marginTop: spacing.sm, textAlign: 'center' },
  footer: { paddingHorizontal: spacing.md + 2 },
});
