import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../../src/components/AppButton';
import { loansApi } from '../../../src/services/endpoints/loans';
import { colors, fonts, radii, spacing } from '../../../src/theme';

interface Installment {
  id: string;
  installmentNumber: number;
  dueDate: string;
  amount: string;
  status: string;
  paidAt: string | null;
}

interface LoanDetail {
  id: string;
  groupId: string;
  amount: string;
  interestRate: string;
  status: string;
  borrower: { id: string; fullName: string | null };
  repaymentSchedule: Installment[];
  contract: { signedByBorrower: boolean } | null;
  votes: unknown[];
  approvals: number;
  rejections: number;
  majorityRequired: number;
}

/**
 * Écran 64 — Détail du prêt : montant emprunté, statut, échéancier
 * (Payée / À venir / En retard) et remboursement de la prochaine échéance
 * (écran 65). Si le prêt est en VOTING, redirige vers le vote (59) pour
 * les validateurs ; APPROVED non signé → contrat (62-63).
 */
export default function LoanDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loan, setLoan] = useState<LoanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await loansApi.getOne(id);
      setLoan(data);
      setError(null);
    } catch {
      setError(t('loansScreen.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  const nextInstallment = loan?.repaymentSchedule.find((s) => s.status !== 'PAID');

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.goldDark} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.goldDark} />
        }
      >
        <Pressable onPress={router.back} hitSlop={12} style={styles.backRow}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </Pressable>

        {error && !loan ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : loan ? (
          <>
            <Text style={styles.header}>
              {t('loansScreen.detailRef', { ref: loan.id.slice(0, 8).toUpperCase() })} ·{' '}
              {loan.status === 'ACTIVE'
                ? t('loansScreen.detailStatusActive')
                : loan.status === 'VOTING'
                  ? t('loansScreen.detailStatusVoting')
                  : loan.status === 'APPROVED'
                    ? t('loansScreen.detailStatusApproved')
                    : loan.status === 'REPAID'
                      ? t('loansScreen.detailStatusRepaid')
                      : t('loansScreen.detailStatusRejected')}
            </Text>

            <View style={styles.potCard}>
              <Text style={styles.potLabel}>{t('loansScreen.borrowedTitle')}</Text>
              <Text style={styles.potValue}>
                {Number(loan.amount).toLocaleString('fr-FR')} FCFA
              </Text>
            </View>

            {/* Prêt en cours de validation → vote ; approuvé non signé → contrat. */}
            {loan.status === 'VOTING' ? (
              <Pressable style={styles.redirectCard} onPress={() => router.push(`/loan/${loan.id}/vote`)}>
                <Text style={styles.redirectText}>{t('loansScreen.goVoteHint')} ›</Text>
              </Pressable>
            ) : null}
            {loan.status === 'APPROVED' && !loan.contract?.signedByBorrower ? (
              <Pressable style={styles.redirectCard} onPress={() => router.push(`/loan/${loan.id}/contract`)}>
                <Text style={styles.redirectText}>{t('loansScreen.goSignHint')} ›</Text>
              </Pressable>
            ) : null}

            {/* Échéancier — maquette 64. */}
            <Text style={styles.sectionTitle}>{t('loansScreen.scheduleTitle')}</Text>
            <View style={styles.card}>
              {loan.repaymentSchedule.length === 0 ? (
                <Text style={styles.emptyText}>{t('loansScreen.schedulePendingApproval')}</Text>
              ) : (
                loan.repaymentSchedule.map((s, i) => {
                  const paid = s.status === 'PAID';
                  const late = s.status === 'LATE' || (!paid && new Date(s.dueDate) < new Date());
                  return (
                    <View key={s.id} style={[styles.cardRow, i > 0 && styles.cardRowBorder]}>
                      <View style={styles.rowLeft}>
                        <Text style={styles.cardLabel}>
                          {t('loansScreen.installmentLabel', { number: s.installmentNumber })} —{' '}
                          {new Date(s.dueDate).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                          })}
                          {paid && s.paidAt
                            ? ` · ${t('loansScreen.paidOnLabel', {
                                date: new Date(s.paidAt).toLocaleDateString('fr-FR'),
                              })}`
                            : late
                              ? ` · ${t('loansScreen.lateLabel')}`
                              : ''}
                        </Text>
                      </View>
                      <Text style={[styles.cardValue, paid && styles.cardValuePaid]}>
                        {Number(s.amount).toLocaleString('fr-FR')}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          </>
        ) : null}
      </ScrollView>

      {loan && loan.status === 'ACTIVE' && nextInstallment ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <AppButton
            label={t('loansScreen.repayButton', {
              amount: Number(nextInstallment.amount).toLocaleString('fr-FR'),
            })}
            onPress={() =>
              router.push({
                pathname: '/loan/[id]/repay',
                params: {
                  id: loan.id,
                  installment: String(nextInstallment.installmentNumber),
                  amount: String(nextInstallment.amount),
                },
              })
            }
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.creamLight },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  backRow: { alignSelf: 'flex-start', marginTop: spacing.sm, marginBottom: spacing.md },
  backText: { fontFamily: fonts.inter.medium, fontSize: 13, color: colors.navy },
  header: { fontFamily: fonts.inter.medium, fontSize: 10.5, color: colors.goldDark, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  potCard: {
    borderWidth: 1.5, borderColor: colors.goldDark, borderRadius: radii.md,
    backgroundColor: colors.cream, padding: spacing.md, alignItems: 'center', marginBottom: spacing.lg,
  },
  potLabel: { fontFamily: fonts.inter.medium, fontSize: 10.5, color: colors.goldDark, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  potValue: { fontFamily: fonts.mono.semiBold, fontSize: 24, color: colors.navyDark },
  redirectCard: {
    borderWidth: 1, borderColor: colors.gold, borderRadius: radii.md,
    backgroundColor: colors.cream, padding: spacing.md, marginBottom: spacing.lg,
  },
  redirectText: { fontFamily: fonts.inter.semiBold, fontSize: 12.5, color: colors.goldDark },
  sectionTitle: { fontFamily: fonts.fraunces.semiBold, fontSize: 15, color: colors.navyDark, marginBottom: spacing.sm },
  card: {
    borderWidth: 1, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm + 2, gap: spacing.sm },
  cardRowBorder: { borderTopWidth: 1, borderTopColor: colors.sand },
  rowLeft: { flex: 1 },
  cardLabel: { fontFamily: fonts.inter.regular, fontSize: 12, color: colors.inkSoft, lineHeight: 17 },
  cardValue: { fontFamily: fonts.mono.medium, fontSize: 12.5, color: colors.navyDark },
  cardValuePaid: { color: colors.success },
  emptyText: { fontFamily: fonts.inter.regular, fontSize: 12.5, color: colors.inkSoft, paddingVertical: spacing.md },
  errorText: { fontFamily: fonts.inter.medium, fontSize: 11.5, color: colors.danger },
  footer: { paddingHorizontal: spacing.md + 2 },
});
