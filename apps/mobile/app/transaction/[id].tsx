import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../src/components/AppButton';
import { transactionsApi } from '../../src/services/endpoints/account';
import { colors, fonts, radii, spacing } from '../../src/theme';

const TYPE_LABEL: Record<string, string> = {
  CONTRIBUTION: 'Cotisation',
  EVENT_CONTRIBUTION: 'Cagnotte',
  ROTATION_PAYOUT: 'Versement de rotation',
  LOAN_DISBURSEMENT: 'Prêt accordé',
  LOAN_REPAYMENT: 'Remboursement',
  MEMBER_EXIT_SETTLEMENT: 'Règlement de sortie',
  EVENT_PAYOUT: 'Versement de cagnotte',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'En attente',
  PROCESSING: 'En cours',
  CONFIRMED: 'Confirmée',
  FAILED: 'Échouée',
};

/**
 * Écran 68 — Détail de la transaction : montant signé, type, statut,
 * date, moyen de paiement, référence opérateur, groupe, cycle —
 * « Partager le reçu » via le partage natif (l'export PDF viendra avec
 * le module relevé, écran 69).
 */
export default function TransactionDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [tx, setTx] = useState<null | {
    id: string;
    groupName: string | null;
    cycleNumber: number | null;
    type: string;
    status: string;
    amount: string;
    currency: string;
    isCredit: boolean;
    externalReference: string | null;
    provider: string | null;
    createdAt: string;
    confirmedAt: string | null;
  }>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await transactionsApi.getOne(id);
        if (!cancelled) setTx(data);
      } catch {
        if (!cancelled) setError(t('historyScreen.detailLoadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  const amountNum = Number(tx?.amount ?? 0);

  const handleShare = () => {
    if (!tx) return;
    Share.share({
      message: `Cercle — ${TYPE_LABEL[tx.type] ?? tx.type} de ${amountNum.toLocaleString('fr-FR')} FCFA · ${
        tx.groupName ?? ''
      } · Réf. ${tx.externalReference ?? tx.id.slice(0, 8).toUpperCase()}`,
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Pressable onPress={router.back} hitSlop={12} style={styles.backRow}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </Pressable>

        {loading ? (
          <ActivityIndicator size="large" color={colors.goldDark} style={styles.spinner} />
        ) : error || !tx ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <>
            <Text style={[styles.amount, tx.isCredit ? styles.amountCredit : styles.amountDebit]}>
              {tx.isCredit ? '+' : '−'} {amountNum.toLocaleString('fr-FR')} FCFA
            </Text>
            <Text style={styles.typeLine}>
              {TYPE_LABEL[tx.type] ?? tx.type}
              {tx.cycleNumber ? ` · cycle ${tx.cycleNumber}` : ''}
            </Text>

            <View style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>{t('historyScreen.statusLabel')}</Text>
                <Text style={[styles.cardValue, tx.status === 'CONFIRMED' && { color: colors.success }]}>
                  {STATUS_LABEL[tx.status] ?? tx.status}
                </Text>
              </View>
              <View style={[styles.cardRow, styles.cardRowBorder]}>
                <Text style={styles.cardLabel}>{t('historyScreen.dateLabel')}</Text>
                <Text style={styles.cardValue}>
                  {new Date(tx.createdAt).toLocaleDateString('fr-FR')} ·{' '}
                  {new Date(tx.createdAt).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <View style={[styles.cardRow, styles.cardRowBorder]}>
                <Text style={styles.cardLabel}>{t('historyScreen.methodLabel')}</Text>
                <Text style={styles.cardValue}>
                  {tx.provider === 'MTN_MOMO' ? 'MTN MoMo' : tx.provider === 'ORANGE_MONEY' ? 'Orange Money' : '—'}
                </Text>
              </View>
              <View style={[styles.cardRow, styles.cardRowBorder]}>
                <Text style={styles.cardLabel}>{t('historyScreen.groupLabel')}</Text>
                <Text style={styles.cardValue}>{tx.groupName ?? '—'}</Text>
              </View>
              <View style={[styles.cardRow, styles.cardRowBorder]}>
                <Text style={styles.cardLabel}>{t('historyScreen.operatorRefLabel')}</Text>
                <Text style={styles.cardValue}>{tx.externalReference ?? '—'}</Text>
              </View>
            </View>
          </>
        )}
      </View>

      {tx ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <AppButton label={t('historyScreen.shareReceiptButton')} onPress={handleShare} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.creamLight },
  content: { flex: 1, paddingHorizontal: spacing.md },
  backRow: { alignSelf: 'flex-start', marginTop: spacing.sm, marginBottom: spacing.md },
  backText: { fontFamily: fonts.inter.medium, fontSize: 13, color: colors.navy },
  spinner: { marginVertical: spacing.xl },
  errorText: { fontFamily: fonts.inter.medium, fontSize: 11.5, color: colors.danger, textAlign: 'center', marginTop: spacing.lg },
  amount: { fontFamily: fonts.mono.semiBold, fontSize: 28, marginBottom: 2 },
  amountCredit: { color: colors.success },
  amountDebit: { color: colors.navyDark },
  typeLine: { fontFamily: fonts.inter.regular, fontSize: 13, color: colors.inkSoft, marginBottom: spacing.lg },
  card: {
    borderWidth: 1, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm + 2 },
  cardRowBorder: { borderTopWidth: 1, borderTopColor: colors.sand },
  cardLabel: { fontFamily: fonts.inter.regular, fontSize: 12.5, color: colors.inkSoft },
  cardValue: { fontFamily: fonts.inter.medium, fontSize: 12.5, color: colors.navyDark },
  footer: { paddingHorizontal: spacing.md + 2 },
});
