import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../src/components/AppButton';
import { colors, fonts, radii, spacing } from '../../src/theme';

const PROVIDER_LABEL: Record<string, string> = {
  MTN_MOMO: 'MTN MoMo',
  ORANGE_MONEY: 'Orange Money',
};

/**
 * Écran 39 — Échec du paiement. Atteint depuis l'écran 33 lorsque le
 * webhook marque la transaction FAILED (statut du ledger, jamais une
 * suppression — traçabilité §6.2). Deux issues : changer de moyen
 * (écran 34) ou réessayer (retour écran 32, une nouvelle transaction
 * PENDING sera créée).
 */
export default function PaymentFailedScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { transactionId, amount, provider, groupId, eventId } =
    useLocalSearchParams<{
      transactionId?: string;
      amount?: string;
      provider?: string;
      groupId?: string;
      eventId?: string;
    }>();

  const providerLabel = provider ? PROVIDER_LABEL[provider] ?? provider : '';
  const amountNum = Number(amount ?? 0);

  const handleRetry = () => {
    // Retour à l'écran 32 : une NOUVELLE transaction PENDING sera créée
    // (la précédente reste FAILED dans le ledger — append-only).
    router.replace({
      pathname: '/payment/pin-prompt',
      params: {
        ...(groupId ? { groupId } : {}),
        ...(eventId ? { eventId } : {}),
        ...(provider ? { provider } : {}),
      },
    });
  };

  const handleChangeMethod = () => {
    router.replace({
      pathname: '/payment/methods',
      params: {
        ...(groupId ? { groupId } : {}),
        ...(eventId ? { eventId } : {}),
        ...(amount ? { amount } : {}),
      },
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>{t('payment.failed.title')}</Text>
        <Text style={styles.subtitle}>
          {t('payment.failed.subtitle', { provider: providerLabel })}
        </Text>

        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('payment.failed.amountLabel')}</Text>
            <Text style={styles.detailValue}>
              {amountNum.toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
          {transactionId ? (
            <View style={[styles.detailRow, styles.detailRowBorder]}>
              <Text style={styles.detailLabel}>{t('payment.failed.refLabel')}</Text>
              <Text style={styles.detailValueSmall}>{transactionId.slice(0, 12)}</Text>
            </View>
          ) : null}
          <View style={[styles.detailRow, styles.detailRowBorder]}>
            <Text style={styles.detailLabel}>{t('payment.failed.codeLabel')}</Text>
            <Text style={styles.detailValueSmall}>
              {provider === 'ORANGE_MONEY' ? 'OM-402' : 'MM-402'}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <AppButton
          label={t('payment.failed.changeMethodButton')}
          variant="ghost"
          onPress={handleChangeMethod}
        />
        <AppButton label={t('payment.failed.retryButton')} onPress={handleRetry} />
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
  icon: {
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
  detailCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.sand,
    borderRadius: radii.md,
    backgroundColor: colors.creamLight,
    paddingHorizontal: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
  },
  detailRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.sand,
  },
  detailLabel: {
    fontFamily: fonts.inter.regular,
    fontSize: 12.5,
    color: colors.inkSoft,
  },
  detailValue: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 13,
    color: colors.danger,
  },
  detailValueSmall: {
    fontFamily: fonts.mono.medium,
    fontSize: 11,
    color: colors.navyDark,
  },
  footer: {
    paddingHorizontal: spacing.md + 2,
    gap: spacing.sm,
  },
});
