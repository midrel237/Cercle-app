import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../../src/components/AppButton';
import { groupsApi } from '../../../src/services/endpoints/groups';
import { useAuthStore } from '../../../src/store/auth.store';
import { colors, fonts, radii, spacing } from '../../../src/theme';

interface CycleStatusMember {
  id: string;
  userId: string;
  fullName: string | null;
  role: 'ADMIN' | 'CASHIER' | 'MEMBER';
  isBeneficiary: boolean;
  contributionStatus: 'PAID' | 'PENDING' | 'LATE';
}

interface CycleStatusResponse {
  cycle: {
    id: string;
    cycleNumber: number;
    dueDate: string;
    expectedAmount: string | null;
    beneficiaryUserId: string;
  } | null;
  contributionAmount: string;
  members: CycleStatusMember[];
}

interface GroupInfo {
  id: string;
  name: string;
  mode: 'ROTATIVE' | 'INTERNAL_LOAN' | 'MIXED';
  contributionAmount: string;
  cashierMemberId: string | null;
  depositAccountProvider: string | null;
}

/**
 * Écran 31 — Détail du groupe / Rotation. Charge le groupe
 * (GET /groups/:id) et le statut du cycle actif
 * (GET /groups/:id/cycle-status) : tour actuel, bénéficiaire, statut de
 * cotisation de chaque membre (Payé / En attente / En retard).
 * « Payer ma cotisation » mène au flux paiement (écran 32, Phase 3).
 */
export default function GroupDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [status, setStatus] = useState<CycleStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [groupRes, statusRes] = await Promise.all([
        groupsApi.getOne(id),
        groupsApi.getCycleStatus(id),
      ]);
      setGroup(groupRes.data);
      setStatus(statusRes.data);
      setError(null);
    } catch {
      setError(t('groupDetail.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  const myMember = status?.members.find((m) => m.userId === user?.id);
  const beneficiary = status?.members.find((m) => m.isBeneficiary);
  const daysLeft = status?.cycle
    ? Math.max(0, Math.ceil((new Date(status.cycle.dueDate).getTime() - Date.now()) / 86400000))
    : null;

  const statusDot = (s: CycleStatusMember['contributionStatus']) =>
    s === 'PAID' ? colors.success : s === 'LATE' ? colors.danger : colors.gold;

  const statusLabel = (s: CycleStatusMember['contributionStatus']) =>
    s === 'PAID'
      ? t('groupDetail.statusPaid')
      : s === 'LATE'
        ? t('groupDetail.statusLate')
        : t('groupDetail.statusPending');

  const roleLabel = (role: CycleStatusMember['role']) =>
    role === 'ADMIN'
      ? t('groupDetail.roleAdmin')
      : role === 'CASHIER'
        ? t('groupDetail.roleCashier')
        : null;

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

        <Text style={styles.groupName}>{group?.name}</Text>
        {status?.cycle ? (
          <Text style={styles.cycleLine}>
            {t('groupDetail.cycleOf', {
              current: status.cycle.cycleNumber,
              total: status.members.length,
            })}
          </Text>
        ) : (
          <Text style={styles.cycleLine}>{t('groupDetail.noActiveCycle')}</Text>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {status?.cycle ? (
          <View style={styles.potCard}>
            <Text style={styles.potLabel}>{t('groupDetail.currentPot')}</Text>
            <Text style={styles.potAmount}>
              {Number(status.cycle.expectedAmount ?? 0).toLocaleString('fr-FR')} FCFA
            </Text>
            {beneficiary ? (
              <Text style={styles.beneficiaryLine}>
                {t('groupDetail.beneficiary')}: {beneficiary.fullName ?? t('groupDetail.unnamed')}
                {daysLeft !== null ? ` · ${t('groupDetail.daysLeft', { count: daysLeft })}` : ''}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Statut de cotisation par membre — maquette écran 31. */}
        <Text style={styles.sectionTitle}>{t('groupDetail.membersSection')}</Text>
        <View style={styles.memberList}>
          {status?.members.map((m) => (
            <View key={m.id} style={styles.memberRow}>
              <View style={[styles.statusDot, { backgroundColor: statusDot(m.contributionStatus) }]} />
              <Text style={styles.memberName} numberOfLines={1}>
                {m.fullName ?? t('groupDetail.unnamed')}
                {m.userId === user?.id ? t('groupDetail.youSuffix') : ''}
                {roleLabel(m.role) ? ` · ${roleLabel(m.role)}` : ''}
                {m.isBeneficiary ? ` · ${t('groupDetail.beneficiaryTag')}` : ''}
              </Text>
              <Text style={styles.memberStatus}>{statusLabel(m.contributionStatus)}</Text>
            </View>
          ))}
        </View>

        <Pressable onPress={() => router.push(`/group/${id}/chat`)} style={styles.chatLink}>
          <Text style={styles.chatLinkText}>{t('groupDetail.openChat')} ›</Text>
        </Pressable>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <AppButton
          label={t('groupDetail.payContribution', {
            amount: Number(group?.contributionAmount ?? 0).toLocaleString('fr-FR'),
          })}
          onPress={() => router.push(`/payment/pin-prompt?groupId=${id}`)}
          disabled={myMember?.contributionStatus === 'PAID'}
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
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  backRow: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  backText: {
    fontFamily: fonts.inter.medium,
    fontSize: 13,
    color: colors.navy,
  },
  groupName: {
    fontFamily: fonts.fraunces.semiBold,
    fontSize: 24,
    color: colors.navyDark,
    marginBottom: 2,
  },
  cycleLine: {
    fontFamily: fonts.inter.regular,
    fontSize: 12.5,
    color: colors.inkSoft,
    marginBottom: spacing.lg,
  },
  errorText: {
    fontFamily: fonts.inter.medium,
    fontSize: 11.5,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  potCard: {
    borderWidth: 1.5,
    borderColor: colors.goldDark,
    borderRadius: radii.md,
    backgroundColor: colors.cream,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  potLabel: {
    fontFamily: fonts.inter.medium,
    fontSize: 10.5,
    color: colors.goldDark,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  potAmount: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 24,
    color: colors.navyDark,
    marginBottom: 2,
  },
  beneficiaryLine: {
    fontFamily: fonts.inter.regular,
    fontSize: 12,
    color: colors.inkSoft,
  },
  sectionTitle: {
    fontFamily: fonts.fraunces.semiBold,
    fontSize: 16,
    color: colors.navyDark,
    marginBottom: spacing.sm,
  },
  memberList: {
    gap: spacing.xs + 2,
    marginBottom: spacing.lg,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.sand,
    borderRadius: radii.sm,
    backgroundColor: colors.creamLight,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  memberName: {
    flex: 1,
    fontFamily: fonts.inter.medium,
    fontSize: 12.5,
    color: colors.navyDark,
  },
  memberStatus: {
    fontFamily: fonts.inter.medium,
    fontSize: 11,
    color: colors.inkSoft,
  },
  chatLink: {
    alignSelf: 'center',
    paddingVertical: spacing.xs,
  },
  chatLinkText: {
    fontFamily: fonts.inter.semiBold,
    fontSize: 12.5,
    color: colors.goldDark,
  },
  footer: {
    paddingHorizontal: spacing.md + 2,
  },
});
