import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../../src/components/AppButton';
import { groupsApi } from '../../../src/services/endpoints/groups';
import { useAuthStore } from '../../../src/store/auth.store';
import { colors, fonts, radii, spacing } from '../../../src/theme';

interface MemberRow {
  id: string;
  userId: string;
  fullName: string | null;
  role: 'ADMIN' | 'CASHIER' | 'MEMBER';
  rotationPosition: number | null;
  trustScore: number;
  isBeneficiary: boolean;
  contributionStatus: 'PAID' | 'PENDING' | 'LATE' | null;
  daysLate: number;
  joinedAt: string;
  exitStatus: string;
}

interface PendingJoin {
  id: string;
  userId: string;
  fullName: string | null;
  requestedAt: string | null;
}

interface MembersResponse {
  isAdmin: boolean;
  inviteCode: string | null;
  memberCount: number;
  members: MemberRow[];
  pendingJoinRequests: PendingJoin[];
  exitRequests: { id: string; userId: string; fullName: string | null }[];
}

/**
 * Écran 42 — Gestion des membres. Liste (rôles, score de fiabilité, statut
 * de cotisation, jours de retard), recherche, demandes d'adhésion en
 * attente (admin : approuver/refuser via join-decision), lien écran 43.
 */
export default function MembersScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const [data, setData] = useState<MembersResponse | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await groupsApi.listMembers(id);
      setData(data);
      setError(null);
    } catch {
      setError(t('membersScreen.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleJoinDecision = async (memberId: string, approve: boolean) => {
    if (!id) return;
    try {
      await groupsApi.decideJoin(id, memberId, approve);
      load();
    } catch {
      setError(t('membersScreen.decisionError'));
    }
  };

  const filtered = data?.members.filter((m) =>
    (m.fullName ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const roleLabel = (r: MemberRow['role']) =>
    r === 'ADMIN'
      ? t('membersScreen.roleAdmin')
      : r === 'CASHIER'
        ? t('membersScreen.roleCashier')
        : null;

  const statusColor = (s: MemberRow['contributionStatus']) =>
    s === 'PAID' ? colors.success : s === 'LATE' ? colors.danger : colors.gold;

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

        <Text style={styles.title}>{t('membersScreen.title')}</Text>
        <Text style={styles.subtitle}>
          {t('membersScreen.memberCount', { count: data?.memberCount ?? 0 })}
        </Text>

        {/* Recherche — maquette écran 42. */}
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={t('membersScreen.searchPlaceholder')}
          placeholderTextColor={colors.inkSoft}
          autoCorrect={false}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Demandes d'adhésion en attente (admin) — maquette écran 28 côté admin. */}
        {data?.isAdmin && data.pendingJoinRequests.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('membersScreen.pendingJoinSection', { count: data.pendingJoinRequests.length })}
            </Text>
            {data.pendingJoinRequests.map((p) => (
              <View key={p.id} style={styles.pendingCard}>
                <Text style={styles.pendingName}>{p.fullName ?? t('membersScreen.unnamed')}</Text>
                <View style={styles.pendingActions}>
                  <Pressable onPress={() => handleJoinDecision(p.id, false)} style={styles.rejectBtn}>
                    <Text style={styles.rejectText}>{t('membersScreen.reject')}</Text>
                  </Pressable>
                  <Pressable onPress={() => handleJoinDecision(p.id, true)} style={styles.approveBtn}>
                    <Text style={styles.approveText}>{t('membersScreen.approve')}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Liste des membres — maquette écran 42 : rôles, Retard, scores. */}
        <View style={styles.list}>
          {filtered?.map((m) => (
            <Pressable
              key={m.id}
              style={styles.memberRow}
              onPress={() =>
                router.push({
                  pathname: '/group/[id]/member/[memberId]',
                  params: { id, memberId: m.id, name: m.fullName ?? '' },
                })
              }
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(m.fullName ?? '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName} numberOfLines={1}>
                  {m.fullName ?? t('membersScreen.unnamed')}
                  {m.userId === user?.id ? t('membersScreen.youSuffix') : ''}
                </Text>
                <Text style={styles.memberMeta}>
                  {roleLabel(m.role) ? `${roleLabel(m.role)} · ` : ''}
                  {t('membersScreen.scoreLabel', { score: m.trustScore })}
                </Text>
              </View>
              {m.contributionStatus === 'LATE' ? (
                <Text style={styles.lateText}>
                  {t('membersScreen.lateDays', { count: m.daysLate })}
                </Text>
              ) : null}
              {m.contributionStatus ? (
                <View style={[styles.statusDot, { backgroundColor: statusColor(m.contributionStatus) }]} />
              ) : null}
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {data?.isAdmin ? (
          <>
            <AppButton
              label={t('membersScreen.inviteButton')}
              onPress={() =>
                router.push({
                  pathname: '/group/[id]/add-member',
                  params: { id, code: data.inviteCode ?? '' },
                })
              }
            />
            {data.exitRequests.length > 0 ? (
              <AppButton
                label={t('membersScreen.exitRequestsButton', { count: data.exitRequests.length })}
                variant="ghost"
                onPress={() => router.push({ pathname: '/group/[id]/exit-requests', params: { id } })}
              />
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.creamLight },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  backRow: { alignSelf: 'flex-start', marginTop: spacing.sm, marginBottom: spacing.md },
  backText: { fontFamily: fonts.inter.medium, fontSize: 13, color: colors.navy },
  title: { fontFamily: fonts.fraunces.semiBold, fontSize: 24, color: colors.navyDark },
  subtitle: { fontFamily: fonts.inter.regular, fontSize: 12.5, color: colors.inkSoft, marginBottom: spacing.md },
  searchInput: {
    fontFamily: fonts.inter.regular, fontSize: 13.5, color: colors.navyDark,
    borderWidth: 1.5, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, marginBottom: spacing.lg,
  },
  errorText: { fontFamily: fonts.inter.medium, fontSize: 11.5, color: colors.danger, marginBottom: spacing.sm },
  section: { marginBottom: spacing.lg },
  sectionTitle: { fontFamily: fonts.fraunces.semiBold, fontSize: 15, color: colors.navyDark, marginBottom: spacing.sm },
  pendingCard: {
    borderWidth: 1.5, borderColor: colors.gold, borderRadius: radii.md,
    backgroundColor: colors.cream, padding: spacing.md, marginBottom: spacing.sm,
  },
  pendingName: { fontFamily: fonts.inter.semiBold, fontSize: 14, color: colors.navyDark, marginBottom: spacing.sm },
  pendingActions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' },
  rejectBtn: { borderRadius: radii.sm, borderWidth: 1.5, borderColor: colors.danger, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2 },
  rejectText: { fontFamily: fonts.inter.semiBold, fontSize: 12, color: colors.danger },
  approveBtn: { borderRadius: radii.sm, backgroundColor: colors.success, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2 },
  approveText: { fontFamily: fonts.inter.semiBold, fontSize: 12, color: colors.white },
  list: { gap: spacing.xs + 2 },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderWidth: 1, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.sm,
  },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.inter.semiBold, fontSize: 15, color: colors.white },
  memberInfo: { flex: 1 },
  memberName: { fontFamily: fonts.inter.medium, fontSize: 13.5, color: colors.navyDark, marginBottom: 1 },
  memberMeta: { fontFamily: fonts.inter.regular, fontSize: 11.5, color: colors.inkSoft },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  lateText: { fontFamily: fonts.inter.semiBold, fontSize: 10.5, color: colors.danger },
  footer: { paddingHorizontal: spacing.md + 2, gap: spacing.sm },
});
