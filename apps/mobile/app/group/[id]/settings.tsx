import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { groupsApi } from '../../../src/services/endpoints/groups';
import { useAuthStore } from '../../../src/store/auth.store';
import { FadeIn, Stagger } from '../../../src/components/motion';
import { colors, fonts, radii, spacing } from '../../../src/theme';

/** Miroir de GET /groups/:id (GroupDto) — champs utilisés par l'écran 26. */
interface GroupRulesData {
  id: string;
  name: string;
  mode: string;
  contributionAmount: string;
  periodicityDays: number;
  penaltyRules: string | null;
  interestRate: string;
  openToDiaspora: boolean;
  memberCount: number;
  cashierMemberId: string | null;
  depositAccountProvider: string | null;
  depositAccountPhoneNumber: string | null;
  members: { id: string; userId: string; fullName?: string | null; role: string }[];
  cycles: { id: string; status: string }[];
}

/**
 * Écran 26 — Règles du groupe (administration).
 * Conforme maquette : carte Règles (montant / cycle, périodicité,
 * pénalité de retard, taux d'intérêt, ouverture diaspora) + carte
 * Administration (caissier désigné, compte de dépôt MoMo du caissier,
 * clôture du groupe). Lecture seule : les règles se définissent à la
 * création (groupe/create/rules) ; les montants restent calculés serveur.
 *
 * Clôture : indisponible tant qu'un cycle est actif — un simple
 * avertissement informatif (pas d'endpoint de clôture dans le backend,
 * conformément à la logique métier : la clôture se fait en fin de cycle).
 */
export default function GroupSettingsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const [group, setGroup] = useState<GroupRulesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await groupsApi.getOne(id);
      setGroup(data);
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

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.goldDark} />
      </View>
    );
  }

  const myMember = group?.members.find((m) => m.userId === user?.id);
  const isAdmin = myMember?.role === 'ADMIN';
  const cashier = group?.members.find((m) => m.id === group.cashierMemberId);
  const hasActiveCycle = (group?.cycles ?? []).some((c) => c.status === 'ACTIVE');

  const row = (label: string, value: string | null | undefined, last = false) => (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>
        {value ?? '—'}
      </Text>
    </View>
  );

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

        <FadeIn dy={10}>
          <Text style={styles.groupName}>{group?.name}</Text>
          <Text style={styles.subtitle}>{t('groupSettings.title')}</Text>
        </FadeIn>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Stagger step={60}>
          <FadeIn delay={120} dy={10}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('groupSettings.rulesSection')}</Text>
              {row(
                t('groupSettings.amountLabel'),
                t('groupSettings.amountValue', {
                  amount: Number(group?.contributionAmount ?? 0).toLocaleString('fr-FR'),
                }),
              )}
              {row(
                t('groupSettings.periodicityLabel'),
                t('createGroup.step3.periodicityDays', { count: group?.periodicityDays ?? 0 }),
              )}
              {row(
                t('groupSettings.penaltyLabel'),
                group?.penaltyRules ?? t('groupSettings.penaltyNone'),
              )}
              {row(
                t('groupSettings.interestLabel'),
                Number(group?.interestRate ?? 0) > 0
                  ? t('groupSettings.interestValue', { rate: Number(group.interestRate) })
                  : t('groupSettings.penaltyNone'),
              )}
              {row(
                t('groupSettings.diasporaLabel'),
                group?.openToDiaspora ? t('groupSettings.diasporaYes') : t('groupSettings.diasporaNo'),
                true,
              )}
            </View>
          </FadeIn>

          <FadeIn delay={200} dy={10}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('groupSettings.administrationSection')}</Text>
              {row(
                t('groupSettings.cashierLabel'),
                cashier?.fullName ?? t('groupSettings.cashierNone'),
              )}
              {row(
                t('groupSettings.depositAccountLabel'),
                group?.depositAccountProvider
                  ? `${group.depositAccountProvider} · ${group.depositAccountPhoneNumber ?? ''}`
                  : t('groupSettings.depositNone'),
                true,
              )}
            </View>
          </FadeIn>

          <FadeIn delay={280} dy={10}>
            <Pressable
              style={styles.closeButton}
              onPress={() => {
                if (hasActiveCycle) {
                  Alert.alert(
                    t('groupSettings.closeGroupAlertTitle'),
                    t('groupSettings.closeGroupHint'),
                  );
                } else {
                  // Aucun cycle actif : la clôture métier passe par le
                  // démarrage du cycle suivant / décision admin côté serveur —
                  // informer pour l'instant (pas d'endpoint de clôture).
                  Alert.alert(
                    t('groupSettings.closeGroupAlertTitle'),
                    t('groupSettings.closeGroupHint'),
                  );
                }
              }}
            >
              <Text style={styles.closeButtonText}>{t('groupSettings.closeGroupLabel')}</Text>
            </Pressable>

            {!isAdmin ? (
              <Text style={styles.hint}>{t('groupSettings.notAdminHint')}</Text>
            ) : null}
          </FadeIn>
        </Stagger>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.creamLight },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  backRow: { alignSelf: 'flex-start', marginTop: spacing.sm, marginBottom: spacing.md },
  backText: { fontFamily: fonts.inter.medium, fontSize: 13, color: colors.navy },
  groupName: { fontFamily: fonts.fraunces.semiBold, fontSize: 24, color: colors.navyDark, marginBottom: 2 },
  subtitle: { fontFamily: fonts.inter.regular, fontSize: 12.5, color: colors.inkSoft, marginBottom: spacing.lg },
  errorText: { fontFamily: fonts.inter.medium, fontSize: 11.5, color: colors.danger, marginBottom: spacing.sm },
  card: {
    borderWidth: 1, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: fonts.fraunces.semiBold, fontSize: 15,
    color: colors.navyDark, marginVertical: spacing.sm,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.sm + 2 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.sand },
  rowLabel: { flex: 1, fontFamily: fonts.inter.regular, fontSize: 12.5, color: colors.inkSoft },
  rowValue: { flex: 1.2, fontFamily: fonts.mono.medium, fontSize: 12.5, color: colors.navyDark, textAlign: 'right' },
  closeButton: {
    borderWidth: 1.5, borderColor: colors.danger, borderRadius: radii.md,
    alignItems: 'center', paddingVertical: spacing.sm + 4, marginTop: spacing.lg,
  },
  closeButtonText: { fontFamily: fonts.inter.semiBold, fontSize: 13.5, color: colors.danger },
  hint: { fontFamily: fonts.inter.regular, fontSize: 11, color: colors.inkSoft, textAlign: 'center', marginTop: spacing.sm },
});
