import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { groupsApi } from '../../src/services/endpoints/groups';
import { useAuthStore } from '../../src/store/auth.store';
import { RotationMotif } from '../../src/components/RotationMotif';
import { CountUp, Stagger } from '../../src/components/motion';
import { colors, fonts, radii, spacing } from '../../src/theme';

/** Forme allégée de la réponse GET /groups (groups.service.findForUser). */
interface GroupMemberLight {
  userId: string;
  role: string;
  isActive: boolean;
  rotationPosition?: number;
}

interface GroupListItem {
  id: string;
  name: string;
  memberCount?: number;
  /** Decimal Prisma → string en JSON. */
  contributionAmount?: string | number;
  members?: GroupMemberLight[];
}

/** Statut de ma cotisation pour le cycle actif d'un groupe. */
type MyContributionStatus = 'UP_TO_DATE' | 'PENDING' | 'LATE' | 'NONE';

interface GroupRow extends GroupListItem {
  cycleNumber: number | null;
  myStatus: MyContributionStatus;
}

/**
 * Écrans 21-22 — Accueil (conforme maquette).
 * Carte de résumé « TOTAL COTISÉ CE MOIS · X groupes actifs · Y
 * cotisation(s) en attente » (montant animé CountUp), puis la liste des
 * groupes avec « Cycle X/N · N membres » et badge À jour / En attente /
 * En retard. L'état vide correspond à l'écran 21 : « + Créer un groupe /
 * Rejoindre avec un code ».
 *
 * Statut par groupe : calculé via GET /groups/:id/cycle-status (cycle
 * actif + statut de cotisation de chaque membre, déjà codé côté backend
 * pour l'écran 31) — pas de nouvel endpoint nécessaire.
 */
export default function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const [rows, setRows] = useState<GroupRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const { data } = await groupsApi.listMine();
      const groups: GroupListItem[] = Array.isArray(data) ? (data as GroupListItem[]) : [];

      // Statut de cotisation du cycle actif par groupe (écran 31 endpoint).
      const enriched: GroupRow[] = await Promise.all(
        groups.map(async (g): Promise<GroupRow> => {
          try {
            const { data: cs } = await groupsApi.getCycleStatus(g.id);
            const me = cs?.members?.find((m) => m.userId === user?.id);
            const myStatus: MyContributionStatus = !cs?.cycle
              ? 'NONE'
              : me?.contributionStatus === 'PAID'
                ? 'UP_TO_DATE'
                : me?.contributionStatus === 'LATE'
                  ? 'LATE'
                  : 'PENDING';
            return {
              ...g,
              cycleNumber: cs?.cycle?.cycleNumber ?? null,
              myStatus,
            };
          } catch {
            // Cycle-status indisponible (groupe sans cycle…) : pas de badge.
            return { ...g, cycleNumber: null, myStatus: 'NONE' };
          }
        }),
      );
      setRows(enriched);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Recharger quand on revient sur l'onglet Accueil (fin de la création
  // d'un groupe, retour du détail, adhésion…).
  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Résumé de la carte (maquette écran 22) : total de mes cotisations
  // confirmées des cycles actifs + décomptes.
  const totalContributed = (rows ?? []).reduce((sum, r) => {
    if (r.myStatus !== 'UP_TO_DATE') return sum;
    return sum + Number(r.contributionAmount ?? 0);
  }, 0);
  const activeGroups = (rows ?? []).length;
  const pendingCount = (rows ?? []).filter(
    (r) => r.myStatus === 'PENDING' || r.myStatus === 'LATE',
  ).length;

  const firstName = user?.fullName?.split(' ')[0];

  const badgeStyle = (status: MyContributionStatus) => {
    switch (status) {
      case 'UP_TO_DATE':
        return styles.badgeUpToDate;
      case 'PENDING':
        return styles.badgePending;
      case 'LATE':
        return styles.badgeLate;
      default:
        return null;
    }
  };
  const badgeLabel = (status: MyContributionStatus) => {
    switch (status) {
      case 'UP_TO_DATE':
        return t('home.group.statusUpToDate');
      case 'PENDING':
        return t('home.group.statusPending');
      case 'LATE':
        return t('home.group.statusLate');
      default:
        return null;
    }
  };

  const renderGroupRow = ({ item }: { item: GroupRow }) => {
    const count = item.memberCount ?? item.members?.filter((m) => m.isActive).length ?? 0;
    const badge = badgeLabel(item.myStatus);
    const metaParts: string[] = [];
    if (item.cycleNumber != null) {
      metaParts.push(
        t('home.group.cycleOf', { current: item.cycleNumber, total: Math.max(count, item.cycleNumber) }),
      );
    }
    metaParts.push(t('home.group.memberCount', { count }));
    return (
      <Pressable
        style={({ pressed }) => [styles.groupRow, pressed && styles.groupRowPressed]}
        onPress={() => router.push(`/group/${item.id}`)}
      >
        <RotationMotif
          size={44}
          animated={false}
          activeIndex={item.members?.find((m) => user && m.userId === user.id)?.rotationPosition ?? 0}
        />
        <View style={styles.groupRowText}>
          <Text style={styles.groupName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.groupMeta} numberOfLines={1}>
            {metaParts.join(' · ')}
          </Text>
        </View>
        {badge && <Text style={[styles.badge, badgeStyle(item.myStatus)]}>{badge}</Text>}
        {!badge && <Text style={styles.chevron}>›</Text>}
      </Pressable>
    );
  };

  const renderBody = () => {
    if (loading) {
      return <ActivityIndicator color={colors.navyDark} style={styles.centered} />;
    }
    if (error) {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{t('home.loadError')}</Text>
          <Pressable onPress={load} hitSlop={8}>
            <Text style={styles.retryLink}>{t('home.retry')}</Text>
          </Pressable>
        </View>
      );
    }
    if (!rows || rows.length === 0) {
      // Écran 21 — état vide : deux cartes d'action (créer / rejoindre).
      return (
        <View style={styles.emptyWrap}>
          <RotationMotif size={110} />
          <Text style={styles.emptyTitle}>{t('home.empty.title')}</Text>
          <Text style={styles.emptySubtitle}>{t('home.empty.subtitle')}</Text>
          <Pressable style={styles.actionCard} onPress={() => router.push('/group/create/step-1')}>
            <Text style={styles.actionCardTitle}>{t('home.empty.cardOneTitle')}</Text>
            <Text style={styles.actionCardHint}>{t('home.empty.cardOneHint')}</Text>
          </Pressable>
          <Pressable style={styles.actionCard} onPress={() => router.push('/group/join')}>
            <Text style={styles.actionCardTitle}>{t('home.empty.cardTwoTitle')}</Text>
            <Text style={styles.actionCardHint}>{t('home.empty.cardTwoHint')}</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <FlatList
        data={rows}
        keyExtractor={(g) => g.id}
        renderItem={renderGroupRow}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Stagger step={50}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{t('home.summary.totalLabel')}</Text>
              <CountUp value={totalContributed} style={styles.summaryAmount} suffix=" FCFA" />
              <Text style={styles.summaryMeta}>
                {t('home.summary.groups', { count: activeGroups })}
                {pendingCount > 0
                  ? ` · ${t('home.summary.pending', { count: pendingCount })}`
                  : ` · ${t('home.summary.allUpToDate')}`}
              </Text>
            </View>
          </Stagger>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.navyDark} />
        }
      />
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.greeting}>
          {t('home.greeting', { name: firstName ?? t('auth.brandName') })}
        </Text>
        <Text style={styles.sectionTitle}>{t('home.myGroups')}</Text>
      </View>
      {renderBody()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.creamLight,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  greeting: {
    fontFamily: fonts.inter.regular,
    fontSize: 13,
    color: colors.inkSoft,
    marginBottom: 2,
  },
  sectionTitle: {
    fontFamily: fonts.fraunces.semiBold,
    fontSize: 24,
    color: colors.navyDark,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  summaryCard: {
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    padding: spacing.md + 2,
    marginBottom: spacing.md,
  },
  summaryLabel: {
    fontFamily: fonts.inter.medium,
    fontSize: 9.5,
    color: colors.lavender,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  summaryAmount: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 26,
    color: colors.white,
    marginBottom: 4,
  },
  summaryMeta: {
    fontFamily: fonts.inter.regular,
    fontSize: 11.5,
    color: colors.lavender,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.creamLight,
    borderWidth: 1,
    borderColor: colors.sand,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  groupRowPressed: {
    opacity: 0.85,
  },
  groupRowText: {
    flex: 1,
  },
  groupName: {
    fontFamily: fonts.inter.semiBold,
    fontSize: 15,
    color: colors.navyDark,
    marginBottom: 2,
  },
  groupMeta: {
    fontFamily: fonts.inter.regular,
    fontSize: 12,
    color: colors.inkSoft,
  },
  badge: {
    fontFamily: fonts.inter.semiBold,
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  badgeUpToDate: {
    backgroundColor: colors.cream,
    color: colors.navyDark,
    borderWidth: 1,
    borderColor: colors.goldDark,
  },
  badgePending: {
    backgroundColor: colors.cream,
    color: colors.goldDark,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  badgeLate: {
    backgroundColor: colors.danger,
    color: colors.white,
  },
  chevron: {
    fontFamily: fonts.inter.regular,
    fontSize: 22,
    color: colors.navySoft,
  },
  errorText: {
    fontFamily: fonts.inter.medium,
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  retryLink: {
    fontFamily: fonts.inter.bold,
    fontSize: 13,
    color: colors.goldDark,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontFamily: fonts.fraunces.semiBold,
    fontSize: 20,
    color: colors.navyDark,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: fonts.inter.regular,
    fontSize: 13,
    color: colors.inkSoft,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.xl,
  },
  actionCard: {
    width: '100%',
    backgroundColor: colors.creamLight,
    borderWidth: 1,
    borderColor: colors.sand,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  actionCardTitle: {
    fontFamily: fonts.inter.semiBold,
    fontSize: 15,
    color: colors.navyDark,
    marginBottom: 2,
  },
  actionCardHint: {
    fontFamily: fonts.inter.regular,
    fontSize: 12,
    color: colors.inkSoft,
  },
});
