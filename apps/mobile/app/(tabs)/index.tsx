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
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { groupsApi } from '../../src/services/endpoints/groups';
import { useAuthStore } from '../../src/store/auth.store';
import { RotationMotif } from '../../src/components/RotationMotif';
import { colors, fonts, radii, spacing } from '../../src/theme';

/** Forme allégée de la réponse GET /groups (groups.service.findForUser) :
 * le groupe avec ses membres, en rôles Prisma (ADMIN / CASHIER / MEMBER). */
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
  members?: GroupMemberLight[];
}

/**
 * Écrans 21-22 — Accueil.
 * Liste les groupes de l'utilisateur (câblé sur GET /groups) avec, pour
 * chacun, sa roue de rotation signature. L'état vide correspond à
 * l'écran 21 de la maquette : deux cartes d'action (créer / rejoindre).
 */
export default function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const [groups, setGroups] = useState<GroupListItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const { data } = await groupsApi.listMine();
      setGroups(Array.isArray(data) ? (data as GroupListItem[]) : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const firstName = user?.fullName?.split(' ')[0];
  const myRole = (group: GroupListItem) => {
    if (!user) return null;
    const me = group.members?.find((m) => m.userId === user.id && m.isActive);
    if (!me) return null;
    switch (me.role) {
      case 'ADMIN':
        return t('home.group.adminRole');
      case 'CASHIER':
        return t('home.group.cashierRole');
      default:
        return t('home.group.memberRole');
    }
  };

  const renderGroupRow = ({ item }: { item: GroupListItem }) => {
    const count = item.memberCount ?? item.members?.filter((m) => m.isActive).length ?? 0;
    const role = myRole(item);
    return (
      <Pressable
        style={({ pressed }) => [styles.groupRow, pressed && styles.groupRowPressed]}
        onPress={() => router.push(`/group/${item.id}`)}
      >
        <RotationMotif
          size={44}
          activeIndex={item.members?.find((m) => user && m.userId === user.id)?.rotationPosition ?? 0}
        />
        <View style={styles.groupRowText}>
          <Text style={styles.groupName}>{item.name}</Text>
          <Text style={styles.groupMeta}>
            {t('home.group.memberCount', { count })} · {role ?? t('home.group.memberRole')}
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
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
    if (!groups || groups.length === 0) {
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
        data={groups}
        keyExtractor={(g) => g.id}
        renderItem={renderGroupRow}
        contentContainerStyle={styles.listContent}
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
