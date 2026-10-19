import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { paymentsApi } from '../../src/services/endpoints/payments';
import { colors, fonts, spacing } from '../../src/theme';

const POLL_INTERVAL_MS = 5000;
const MAX_POLLS = 36; // ~3 minutes puis message d'attente prolongée.

const PROVIDER_LABEL: Record<string, string> = {
  MTN_MOMO: 'MTN Mobile Money',
  ORANGE_MONEY: 'Orange Money',
};

/**
 * Écran 33 — Paiement en cours. Polling de GET /transactions/:id toutes
 * les 5 s : le webhook de l'agrégateur (POST /payments/webhook) fait
 * passer le statut à CONFIRMED ou FAILED. Selon le type de transaction :
 * LOAN_REPAYMENT → écran 66 (remboursement confirmé) ; sinon → écran 40
 * (reçu) ; FAILED → écran 39 (échec).
 */
export default function PaymentProcessingScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { transactionId, amount, provider, groupId, eventId, loanId } =
    useLocalSearchParams<{
      transactionId?: string;
      amount?: string;
      provider?: string;
      groupId?: string;
      eventId?: string;
      loanId?: string;
    }>();

  const [timedOut, setTimedOut] = useState(false);
  const pollCount = useRef(0);

  useEffect(() => {
    if (!transactionId) return;
    let cancelled = false;

    const poll = async () => {
      pollCount.current += 1;
      if (pollCount.current > MAX_POLLS) {
        if (!cancelled) setTimedOut(true);
        return;
      }
      try {
        const { data } = await paymentsApi.getTransaction(transactionId);
        if (cancelled || !data) return;
        if (data.status === 'CONFIRMED') {
          if (data.type === 'LOAN_REPAYMENT' && loanId) {
            // Remboursement de prêt : écran 66 — les échéances restantes
            // sont recalculées par le détail du prêt.
            router.replace({
              pathname: '/loan/repayment-confirmed',
              params: { amount: amount ?? String(data.amount), loanId },
            });
            return;
          }
          router.replace({
            pathname: '/payment/receipt',
            params: {
              transactionId,
              amount: amount ?? String(data.amount),
              provider: provider ?? data.provider ?? 'MTN_MOMO',
              ...(groupId ? { groupId } : {}),
            },
          });
          return;
        }
        if (data.status === 'FAILED') {
          router.replace({
            pathname: '/payment/failed',
            params: {
              transactionId,
              amount: amount ?? String(data.amount),
              provider: provider ?? data.provider ?? 'MTN_MOMO',
              ...(groupId ? { groupId } : {}),
              ...(loanId ? { loanId } : {}),
            },
          });
          return;
        }
        // PENDING / PROCESSING : on continue d'attendre.
        setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        if (!cancelled) setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [transactionId, amount, provider, groupId, loanId]);

  const providerLabel = provider ? PROVIDER_LABEL[provider] ?? provider : '';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={styles.title}>{t('payment.processing.title')}</Text>
        <Text style={styles.subtitle}>
          {t('payment.processing.subtitle', { provider: providerLabel })}
        </Text>
        <Text style={styles.amount}>
          {(Number(amount ?? 0)).toLocaleString('fr-FR')} FCFA
        </Text>
        {timedOut ? (
          <Text style={styles.timeoutText}>{t('payment.processing.timeout')}</Text>
        ) : (
          <Text style={styles.hint}>{t('payment.processing.hint')}</Text>
        )}
        <Text style={styles.refText}>{t('payment.processing.refWaiting')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navyDark,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontFamily: fonts.fraunces.semiBold,
    fontSize: 20,
    color: colors.white,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.inter.regular,
    fontSize: 12.5,
    color: colors.lavender,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  amount: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 24,
    color: colors.gold,
    marginBottom: spacing.lg,
  },
  hint: {
    fontFamily: fonts.inter.regular,
    fontSize: 11,
    color: colors.lavenderSoft,
    textAlign: 'center',
  },
  timeoutText: {
    fontFamily: fonts.inter.medium,
    fontSize: 11.5,
    color: colors.gold,
    textAlign: 'center',
    lineHeight: 17,
  },
  refText: {
    fontFamily: fonts.mono.medium,
    fontSize: 10.5,
    color: colors.lavenderSoft,
    marginTop: spacing.md,
  },
});
