import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../../src/components/AppButton';
import { loansApi } from '../../../src/services/endpoints/loans';
import { useAuthStore } from '../../../src/store/auth.store';
import { colors, fonts, radii, spacing } from '../../../src/theme';

interface LoanVote {
  voterId: string;
  approve: boolean;
  voter: { id: string; fullName: string | null };
}

interface LoanDetail {
  id: string;
  groupId: string;
  borrowerId: string;
  amount: string;
  status: string;
  borrower: { id: string; fullName: string | null };
  votes: LoanVote[];
  majorityRequired: number;
  approvals: number;
  rejections: number;
  activeMembers: number;
}

/**
 * Écran 59 — Approbation collective : demande, votes des membres
 * (✓ / … / —), majorité requise, Refuser / Approuver. Le vote bascule
 * automatiquement le prêt (écrans 60/61) dès que la majorité est atteinte.
 */
export default function LoanVoteScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const [loan, setLoan] = useState<LoanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
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

  const handleVote = async (approve: boolean) => {
    if (!id || voting) return;
    setVoting(true);
    setError(null);
    try {
      const { data: updated } = await loansApi.vote(id, approve);
      if (updated?.status === 'APPROVED' && updated?.borrowerId === user?.id) {
        // Ma propre demande approuvée/refusée par mon vote final impossible —
        // si le demandeur voit le résultat, rediriger vers 60/61.
        router.replace(`/loan/approved?loanId=${id}`);
        return;
      }
      if (updated?.status === 'REJECTED' && updated?.borrowerId === user?.id) {
        router.replace(`/loan/rejected?loanId=${id}`);
        return;
      }
      load();
    } catch {
      setError(t('loansScreen.voteError'));
      setVoting(false);
    }
  };

  const myVote = loan?.votes.find((v) => v.voterId === user?.id);
  const isBorrower = loan?.borrowerId === user?.id;
  const isVoting = loan?.status === 'VOTING';

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

        <Text style={styles.title}>{t('loansScreen.voteTitle')}</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loan ? (
          <>
            <Text style={styles.requestLine}>
              {t('loansScreen.voteRequestLine', {
                name: loan.borrower?.fullName ?? t('loansScreen.unnamed'),
                amount: Number(loan.amount).toLocaleString('fr-FR'),
              })}
            </Text>

            <View style={styles.progressCard}>
              <Text style={styles.progressLabel}>
                {t('loansScreen.voteProgress', {
                  approvals: loan.approvals,
                  required: loan.majorityRequired,
                })}
              </Text>
              <Text style={styles.progressDetail}>
                {t('loansScreen.voteActiveMembers', { count: loan.activeMembers })}
              </Text>
            </View>

            {/* Votes des membres — maquette 59 : ✓ / … / — */}
            <View style={styles.votesCard}>
              {loan.votes.map((v) => (
                <View key={v.voterId} style={styles.voteRow}>
                  <Text style={styles.voteName}>
                    {v.voter?.fullName ?? t('loansScreen.unnamed')}
                    {v.voterId === user?.id ? t('membersScreen.youSuffix') : ''}
                  </Text>
                  <Text style={v.approve ? styles.voteApprove : styles.voteReject}>
                    {v.approve ? '✓' : '—'}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      {isVoting && !isBorrower ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <AppButton
            label={t('loansScreen.voteReject')}
            variant="ghost"
            onPress={() => handleVote(false)}
            disabled={voting || myVote?.approve === false}
          />
          <AppButton
            label={t('loansScreen.voteApprove')}
            onPress={() => handleVote(true)}
            disabled={voting || myVote?.approve === true}
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
  title: { fontFamily: fonts.fraunces.semiBold, fontSize: 22, color: colors.navyDark, marginBottom: spacing.sm },
  requestLine: { fontFamily: fonts.inter.medium, fontSize: 13.5, color: colors.navyDark, marginBottom: spacing.lg, lineHeight: 19 },
  progressCard: {
    borderWidth: 1.5, borderColor: colors.gold, borderRadius: radii.md,
    backgroundColor: colors.cream, padding: spacing.md, marginBottom: spacing.lg,
  },
  progressLabel: { fontFamily: fonts.inter.semiBold, fontSize: 13, color: colors.navyDark, marginBottom: 2 },
  progressDetail: { fontFamily: fonts.inter.regular, fontSize: 11.5, color: colors.inkSoft },
  votesCard: {
    borderWidth: 1, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md,
  },
  voteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm + 2 },
  voteName: { fontFamily: fonts.inter.regular, fontSize: 13, color: colors.navyDark },
  voteApprove: { fontFamily: fonts.inter.semiBold, fontSize: 14, color: colors.success },
  voteReject: { fontFamily: fonts.inter.semiBold, fontSize: 14, color: colors.danger },
  errorText: { fontFamily: fonts.inter.medium, fontSize: 11.5, color: colors.danger, marginBottom: spacing.sm },
  footer: { paddingHorizontal: spacing.md + 2, gap: spacing.sm },
});
