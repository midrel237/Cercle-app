import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { groupsApi } from '../../../src/services/endpoints/groups';
import { colors, fonts, radii, spacing } from '../../../src/theme';

interface ExitRequestRow {
  memberId: string;
  userId: string;
  fullName: string | null;
  requestedAt: string | null;
  reason: string | null;
  rotationReceived: boolean;
  amountToRefund: string;
  amountToSettle: string;
}

/**
 * Écran 52 — Demandes de sortie (admin). Pour chaque demande : nom,
 * montant à rembourser (tour non passé) ou solde dû (tour reçu), motif,
 * Refuser / Approuver → decideExit (existant) qui applique la règle
 * métier et crée les transactions MEMBER_EXIT_SETTLEMENT dans le ledger.
 */
export default function ExitRequestsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [requests, setRequests] = useState<ExitRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await groupsApi.listExitRequests(id);
      setRequests(data ?? []);
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

  const handleDecision = async (memberId: string, approve: boolean) => {
    if (!id) return;
    try {
      await groupsApi.decideExit(id, memberId, approve);
      load();
    } catch {
      setError(t('membersScreen.decisionError'));
    }
  };

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

        <Text style={styles.title}>{t('membersScreen.exitRequestsTitle')}</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator size="large" color={colors.goldDark} style={styles.spinner} />
        ) : requests.length === 0 ? (
          <Text style={styles.emptyText}>{t('membersScreen.exitRequestsEmpty')}</Text>
        ) : (
          requests.map((r) => (
            <View key={r.memberId} style={styles.requestCard}>
              <Text style={styles.requestName}>{r.fullName ?? t('membersScreen.unnamed')}</Text>
              <Text style={styles.requestAmount}>
                {r.rotationReceived
                  ? t('membersScreen.exitSoldeDu', {
                      amount: Number(r.amountToSettle).toLocaleString('fr-FR'),
                    })
                  : t('membersScreen.exitARembourser', {
                      amount: Number(r.amountToRefund).toLocaleString('fr-FR'),
                    })}
              </Text>
              {r.reason ? <Text style={styles.requestReason}>« {r.reason} »</Text> : null}

              <View style={styles.actionsRow}>
                <Pressable
                  onPress={() => handleDecision(r.memberId, false)}
                  style={styles.rejectBtn}
                >
                  <Text style={styles.rejectText}>{t('membersScreen.reject')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleDecision(r.memberId, true)}
                  style={styles.approveBtn}
                >
                  <Text style={styles.approveText}>{t('membersScreen.approve')}</Text>
                </Pressable>
              </View>
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
  backRow: { alignSelf: 'flex-start', marginTop: spacing.sm, marginBottom: spacing.md },
  backText: { fontFamily: fonts.inter.medium, fontSize: 13, color: colors.navy },
  title: { fontFamily: fonts.fraunces.semiBold, fontSize: 22, color: colors.navyDark, marginBottom: spacing.lg },
  errorText: { fontFamily: fonts.inter.medium, fontSize: 11.5, color: colors.danger, marginBottom: spacing.sm },
  spinner: { marginVertical: spacing.xl },
  emptyText: { fontFamily: fonts.inter.regular, fontSize: 12.5, color: colors.inkSoft, textAlign: 'center', marginTop: spacing.xl },
  requestCard: {
    borderWidth: 1.5, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, padding: spacing.md, marginBottom: spacing.sm,
  },
  requestName: { fontFamily: fonts.inter.semiBold, fontSize: 14.5, color: colors.navyDark, marginBottom: 2 },
  requestAmount: { fontFamily: fonts.mono.medium, fontSize: 12, color: colors.inkSoft, marginBottom: 2 },
  requestReason: { fontFamily: fonts.inter.regular, fontSize: 11.5, color: colors.inkSoft, fontStyle: 'italic', marginBottom: spacing.sm },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' },
  rejectBtn: { borderRadius: radii.sm, borderWidth: 1.5, borderColor: colors.danger, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2 },
  rejectText: { fontFamily: fonts.inter.semiBold, fontSize: 12, color: colors.danger },
  approveBtn: { borderRadius: radii.sm, backgroundColor: colors.success, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2 },
  approveText: { fontFamily: fonts.inter.semiBold, fontSize: 12, color: colors.white },
});
