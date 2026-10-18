import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loansApi } from '../../src/services/endpoints/loans';
import { colors, fonts, radii, spacing } from '../../src/theme';

interface LoanRow {
  id: string;
  groupId: string;
  groupName: string;
  amount: string;
  interestRate: string;
  status: string;
  requestedAt: string;
  approvedAt: string | null;
  contractSigned: boolean;
  installmentsPaid: number;
  installmentsTotal: number;
  remainingAmount: string;
  totalWithInterest: number;
  nextDueDate: string | null;
  nextInstallmentAmount: string | null;
}

/**
 * Écran 57 — Mes prêts : RESTE À REMBOURSER global, prêts actifs
 * (prochaine échéance) et prêts soldés. Navigation vers détail (64),
 * vote (59) et demande (58).
 */
export default function LoansScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await loansApi.listMine();
      setLoans(data ?? []);
      setError(null);
    } catch {
      setError(t('loansScreen.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const remainingTotal = loans
    .filter((l) => l.status === 'ACTIVE')
    .reduce((sum, l) => sum + Number(l.remainingAmount), 0);

  const active = loans.filter(
    (l) => l.status === 'ACTIVE' || l.status === 'APPROVED' || l.status === 'VOTING',
  );
  const repaid = loans.filter((l) => l.status === 'REPAID');
  const rejected = loans.filter((l) => l.status === 'REJECTED');

  const dateLabel = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';

  const card = (l: LoanRow, activeStyle = false) => (
    <Pressable
      key={l.id}
      style={[styles.loanCard, activeStyle && styles.loanCardActive]}
      onPress={() => router.push(`/loan/${l.id}`)}
    >
      <Text style={styles.loanGroup} numberOfLines={1}>
        {l.groupName}
      </Text>
      <Text style={styles.loanAmount}>
        {Number(l.amount).toLocaleString('fr-FR')} FCFA
        {Number(l.interestRate) > 0
          ? ` · ${Number(l.interestRate).toLocaleString('fr-FR')} %`
          : ''}
      </Text>
      {l.status === 'ACTIVE' ? (
        <Text style={styles.loanMeta}>
          {t('loansScreen.activeMeta', {
            paid: l.installmentsPaid,
            total: l.installmentsTotal,
            remaining: Number(l.remainingAmount).toLocaleString('fr-FR'),
          })}
          {l.nextDueDate ? ` · ${t('loansScreen.nextDue', { date: dateLabel(l.nextDueDate) })}` : ''}
        </Text>
      ) : l.status === 'REPAID' ? (
        <Text style={styles.loanMeta}>
          {t('loansScreen.repaidMeta', { date: dateLabel(l.approvedAt) })}
        </Text>
      ) : l.status === 'VOTING' ? (
        <Text style={[styles.loanMeta, { color: colors.goldDark }]}>
          {t('loansScreen.votingMeta')}
        </Text>
      ) : l.status === 'APPROVED' ? (
        <Text style={[styles.loanMeta, { color: colors.goldDark }]}>
          {l.contractSigned ? t('loansScreen.signedMeta') : t('loansScreen.approvedMeta')}
        </Text>
      ) : l.status === 'REJECTED' ? (
        <Text style={[styles.loanMeta, { color: colors.danger }]}>{t('loansScreen.rejectedMeta')}</Text>
      ) : null}
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
        <Text style={styles.title}>{t('loansScreen.title')}</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator size="large" color={colors.goldDark} style={styles.spinner} />
        ) : (
          <>
            {/* Reste à rembourser — maquette écran 57. */}
            <View style={styles.potCard}>
              <Text style={styles.potLabel}>{t('loansScreen.remainingTitle')}</Text>
              <Text style={styles.potValue}>
                {remainingTotal.toLocaleString('fr-FR')} FCFA
              </Text>
              <Text style={styles.potDetail}>
                {t('loansScreen.activeCount', {
                  count: active.filter((l) => l.status === 'ACTIVE').length,
                  installments: active.reduce((s, l) => s + (l.installmentsTotal - l.installmentsPaid), 0),
                })}
              </Text>
            </View>

            {active.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t('loansScreen.activeSection', { count: active.length })}
                </Text>
                {active.map((l) => card(l, true))}
              </View>
            ) : (
              <Text style={styles.emptyText}>{t('loansScreen.noActiveLoans')}</Text>
            )}

            {rejected.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('loansScreen.rejectedSection')}</Text>
                {rejected.map((l) => card(l))}
              </View>
            ) : null}

            {repaid.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t('loansScreen.repaidSection', { count: repaid.length })}
                </Text>
                {repaid.map((l) => card(l))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <Pressable onPress={() => router.push('/loan/request')} style={styles.newButton}>
          <Text style={styles.newButtonText}>{t('loansScreen.newRequestButton')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.creamLight },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  title: { fontFamily: fonts.fraunces.semiBold, fontSize: 24, color: colors.navyDark, marginBottom: spacing.lg },
  errorText: { fontFamily: fonts.inter.medium, fontSize: 11.5, color: colors.danger, marginBottom: spacing.sm },
  spinner: { marginVertical: spacing.xl },
  potCard: {
    borderWidth: 1.5, borderColor: colors.goldDark, borderRadius: radii.md,
    backgroundColor: colors.cream, padding: spacing.md, alignItems: 'center', marginBottom: spacing.lg,
  },
  potLabel: { fontFamily: fonts.inter.medium, fontSize: 10.5, color: colors.goldDark, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  potValue: { fontFamily: fonts.mono.semiBold, fontSize: 24, color: colors.navyDark, marginBottom: 2 },
  potDetail: { fontFamily: fonts.inter.regular, fontSize: 11.5, color: colors.inkSoft },
  section: { marginBottom: spacing.lg },
  sectionTitle: { fontFamily: fonts.fraunces.semiBold, fontSize: 15, color: colors.navyDark, marginBottom: spacing.sm },
  loanCard: {
    borderWidth: 1, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, padding: spacing.md, marginBottom: spacing.sm,
  },
  loanCardActive: { borderColor: colors.gold },
  loanGroup: { fontFamily: fonts.inter.semiBold, fontSize: 14, color: colors.navyDark, marginBottom: 2 },
  loanAmount: { fontFamily: fonts.mono.medium, fontSize: 12.5, color: colors.navyDark, marginBottom: 2 },
  loanMeta: { fontFamily: fonts.inter.regular, fontSize: 11.5, color: colors.inkSoft },
  emptyText: { fontFamily: fonts.inter.regular, fontSize: 12.5, color: colors.inkSoft, textAlign: 'center', marginTop: spacing.xl },
  footer: { paddingHorizontal: spacing.md + 2 },
  newButton: {
    backgroundColor: colors.navy, borderRadius: radii.md,
    alignItems: 'center', paddingVertical: spacing.sm + 4,
  },
  newButtonText: { fontFamily: fonts.inter.semiBold, fontSize: 14, color: colors.white },
});
