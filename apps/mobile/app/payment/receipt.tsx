import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../src/components/AppButton';
import { paymentsApi } from '../../src/services/endpoints/payments';
import { colors, fonts, radii, spacing } from '../../src/theme';

const PROVIDER_LABEL: Record<string, string> = {
  MTN_MOMO: 'MTN MoMo',
  ORANGE_MONEY: 'Orange Money',
};

interface TransactionDetail {
  id: string;
  amount: string;
  externalReference: string | null;
  confirmedAt: string | null;
  provider: string | null;
  groupId: string;
}

/**
 * Écran 40 — Reçu de transaction. Atteint depuis l'écran 33 après
 * confirmation webhook : recharge la transaction (GET /transactions/:id)
 * pour afficher la référence opérateur et la date réelles. « Partager le
 * reçu » utilise le partage natif (expo-sharing en production).
 */
export default function PaymentReceiptScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { transactionId, amount: amountParam, provider: providerParam, groupId } =
    useLocalSearchParams<{
      transactionId?: string;
      amount?: string;
      provider?: string;
      groupId?: string;
    }>();

  const [tx, setTx] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(!!transactionId);

  useEffect(() => {
    if (!transactionId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await paymentsApi.getTransaction(transactionId);
        if (!cancelled) setTx(data);
      } catch {
        // Silencieux : les paramètres de navigation suffisent en secours.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [transactionId]);

  const amount = tx?.amount ?? amountParam ?? '0';
  const provider = tx?.provider ?? providerParam ?? 'MTN_MOMO';
  const reference = tx?.externalReference ?? `REF-${(tx?.id ?? transactionId ?? '').slice(0, 8)}`;
  const dateLabel = tx?.confirmedAt
    ? new Date(tx.confirmedAt).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

  const handleShare = () => {
    // TODO: expo-sharing / Share natif avec un récapitulatif texte ou PDF.
    // MVP : retour au groupe — le partage natif sera branché avec le
    // module de génération de reçu PDF (écran 69, relevé).
    if (groupId) {
      router.replace({ pathname: '/group/[id]', params: { id: groupId } });
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.goldDark} />
        ) : (
          <>
            <View style={styles.successBadge}>
              <Text style={styles.successIcon}>✓</Text>
            </View>
            <Text style={styles.title}>{t('payment.receipt.title')}</Text>
            <Text style={styles.amount}>
              {Number(amount).toLocaleString('fr-FR')} FCFA
            </Text>

            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('payment.receipt.operatorLabel')}</Text>
                <Text style={styles.detailValue}>
                  {PROVIDER_LABEL[provider] ?? provider}
                </Text>
              </View>
              <View style={[styles.detailRow, styles.detailRowBorder]}>
                <Text style={styles.detailLabel}>{t('payment.receipt.refLabel')}</Text>
                <Text style={styles.detailValueSmall}>{reference}</Text>
              </View>
              <View style={[styles.detailRow, styles.detailRowBorder]}>
                <Text style={styles.detailLabel}>{t('payment.receipt.dateLabel')}</Text>
                <Text style={styles.detailValueSmall}>{dateLabel}</Text>
              </View>
            </View>

            <Pressable onPress={handleShare} hitSlop={8}>
              <Text style={styles.shareLink}>{t('payment.receipt.shareButton')}</Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <AppButton
          label={t('payment.receipt.doneButton')}
          onPress={() => {
            if (groupId) {
              router.replace({ pathname: '/group/[id]', params: { id: groupId } });
            } else {
              router.replace('/(tabs)');
            }
          }}
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
    paddingHorizontal: spacing.xl,
  },
  successBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  successIcon: {
    fontSize: 32,
    color: colors.white,
    fontFamily: fonts.inter.bold,
  },
  title: {
    fontFamily: fonts.fraunces.semiBold,
    fontSize: 22,
    color: colors.navyDark,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  amount: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 28,
    color: colors.success,
    marginBottom: spacing.lg,
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
    fontFamily: fonts.inter.semiBold,
    fontSize: 13,
    color: colors.navyDark,
  },
  detailValueSmall: {
    fontFamily: fonts.mono.medium,
    fontSize: 11,
    color: colors.navyDark,
  },
  shareLink: {
    fontFamily: fonts.inter.semiBold,
    fontSize: 12.5,
    color: colors.goldDark,
    marginTop: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.md + 2,
  },
});
