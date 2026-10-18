import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  transactionsApi,
  HistoryFilter,
} from '../../src/services/endpoints/account';
import { colors, fonts, radii, spacing } from '../../src/theme';

interface TxRow {
  id: string;
  groupId: string | null;
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
}

interface DayGroup {
  date: string;
  items: TxRow[];
}

const TYPE_LABEL: Record<string, string> = {
  CONTRIBUTION: 'Cotisation',
  EVENT_CONTRIBUTION: 'Cagnotte',
  ROTATION_PAYOUT: 'Versement de rotation',
  LOAN_DISBURSEMENT: 'Prêt accordé',
  LOAN_REPAYMENT: 'Remboursement',
  MEMBER_EXIT_SETTLEMENT: 'Règlement de sortie',
  EVENT_PAYOUT: 'Versement de cagnotte',
};

const FILTERS: { key: HistoryFilter; label: string }[] = [
  { key: 'ALL', label: 'Tout' },
  { key: 'CONTRIBUTIONS', label: 'Cotisations' },
  { key: 'LOANS', label: 'Prêts' },
];

/**
 * Écran 67 — Historique : transactions groupées par jour, filtres
 * Tout / Cotisations / Prêts, montants signés (+ crédit / − débit),
 * référence opérateur. Appui → détail (écran 68).
 */
export default function HistoryScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [filter, setFilter] = useState<HistoryFilter>('ALL');
  const [days, setDays] = useState<DayGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await transactionsApi.myHistory(filter);
      setDays(data ?? []);
      setError(null);
    } catch {
      setError(t('historyScreen.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, t]);

  useEffect(() => {
    load();
  }, [load]);

  const todayKey = new Date().toISOString().slice(0, 10);

  const dayLabel = (date: string) => {
    if (date === todayKey) return t('historyScreen.today');
    return new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
    });
  };

  const row = (tx: TxRow) => (
    <Pressable
      key={tx.id}
      style={styles.txRow}
      onPress={() => router.push(`/transaction/${tx.id}`)}
    >
      <View style={styles.txLeft}>
        <Text style={styles.txTitle} numberOfLines={1}>
          {TYPE_LABEL[tx.type] ?? tx.type}
          {tx.groupName ? ` — ${tx.groupName}` : ''}
        </Text>
        <Text style={styles.txMeta} numberOfLines={1}>
          {new Date(tx.createdAt).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
          {tx.provider ? ` · ${tx.provider === 'MTN_MOMO' ? 'MTN MoMo' : 'Orange Money'}` : ''}
          {tx.externalReference ? ` · ${tx.externalReference}` : ''}
        </Text>
      </View>
      <Text style={[styles.txAmount, tx.isCredit ? styles.txAmountCredit : styles.txAmountDebit]}>
        {tx.isCredit ? '+' : '−'} {Number(tx.amount).toLocaleString('fr-FR')}
      </Text>
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.goldDark} />
        }
      >
        <Text style={styles.title}>{t('historyScreen.title')}</Text>

        {/* Filtres — maquette 67 : Tout / Cotisations / Prêts. */}
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => {
                setFilter(f.key);
                setLoading(true);
              }}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator size="large" color={colors.goldDark} style={styles.spinner} />
        ) : days.length === 0 ? (
          <Text style={styles.emptyText}>{t('historyScreen.empty')}</Text>
        ) : (
          days.map((day) => (
            <View key={day.date} style={styles.daySection}>
              <Text style={styles.dayTitle}>{dayLabel(day.date)}</Text>
              <View style={styles.dayCard}>{day.items.map(row)}</View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.creamLight },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  title: { fontFamily: fonts.fraunces.semiBold, fontSize: 24, color: colors.navyDark, marginBottom: spacing.md },
  filterRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  filterChip: {
    borderWidth: 1.5, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
  },
  filterChipActive: { borderColor: colors.goldDark, backgroundColor: colors.cream },
  filterText: { fontFamily: fonts.inter.medium, fontSize: 12.5, color: colors.inkSoft },
  filterTextActive: { color: colors.navyDark, fontFamily: fonts.inter.semiBold },
  errorText: { fontFamily: fonts.inter.medium, fontSize: 11.5, color: colors.danger, marginBottom: spacing.sm },
  spinner: { marginVertical: spacing.xl },
  emptyText: { fontFamily: fonts.inter.regular, fontSize: 12.5, color: colors.inkSoft, textAlign: 'center', marginTop: spacing.xl },
  daySection: { marginBottom: spacing.lg },
  dayTitle: { fontFamily: fonts.fraunces.semiBold, fontSize: 15, color: colors.navyDark, marginBottom: spacing.sm },
  dayCard: {
    borderWidth: 1, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md,
  },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm + 2, gap: spacing.sm },
  txLeft: { flex: 1 },
  txTitle: { fontFamily: fonts.inter.medium, fontSize: 12.5, color: colors.navyDark, marginBottom: 1 },
  txMeta: { fontFamily: fonts.inter.regular, fontSize: 10.5, color: colors.inkSoft },
  txAmount: { fontFamily: fonts.mono.semiBold, fontSize: 13 },
  txAmountCredit: { color: colors.success },
  txAmountDebit: { color: colors.navyDark },
});
