import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { groupsApi } from '../../../src/services/endpoints/groups';
import { colors, fonts, radii, spacing } from '../../../src/theme';

/**
 * Écran 44 — Actions sur le membre (maquette : Contacter, Envoyer un
 * rappel, Promouvoir administrateur, Désigner caissier, Retirer du
 * groupe). Les actions admin n'apparaissent que pour l'admin.
 * « Promouvoir administrateur » est un placeholder : le schéma actuel
 * ne prévoit qu'un admin (le créateur) — promotion à décider côté produit.
 */
export default function MemberActionsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id, memberId, name, days } = useLocalSearchParams<{
    id: string;
    memberId: string;
    name?: string;
    days?: string;
  }>();

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await groupsApi.listMembers(id);
        if (!cancelled) setIsAdmin(data?.isAdmin ?? false);
      } catch {
        // Silencieux : l'écran dégrade en actions non-admin.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const row = (label: string, onPress: () => void, danger = false) => (
    <Pressable style={[styles.actionRow, danger && styles.actionRowDanger]} onPress={onPress}>
      <Text style={[styles.actionLabel, danger && styles.actionLabelDanger]}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={router.back} hitSlop={12} style={styles.backRow}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </Pressable>

        {loading ? (
          <ActivityIndicator size="large" color={colors.goldDark} style={styles.spinner} />
        ) : (
          <>
            <Pressable
              style={styles.headerCard}
              onPress={() =>
                router.push({
                  pathname: '/group/[id]/member/[memberId]',
                  params: { id, memberId, name: name ?? '' },
                })
              }
            >
              <Text style={styles.headerName}>{name ?? t('membersScreen.unnamed')}</Text>
              <Text style={styles.headerHint}>{t('membersScreen.viewProfileHint')}</Text>
            </Pressable>

            {row(t('membersScreen.actionContact'), () => {})}

            {isAdmin ? (
              <>
                {row(t('membersScreen.actionReminder'), () =>
                  router.push({
                    pathname: '/group/[id]/manual-reminder',
                    params: { id, memberId, name: name ?? '', days: days ?? '0' },
                  }),
                )}
                {row(t('membersScreen.actionPromoteAdmin'), () => {})}
                {row(t('membersScreen.actionAssignCashier'), () =>
                  router.push({ pathname: '/group/[id]/assign-cashier', params: { id } }),
                )}
                {row(t('membersScreen.actionRemove'), () =>
                  router.push({
                    pathname: '/group/[id]/remove-member-confirm',
                    params: { id, memberId, name: name ?? '' },
                  }),
                true)}
              </>
            ) : null}
          </>
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
  spinner: { marginVertical: spacing.xl },
  headerCard: {
    borderWidth: 1.5, borderColor: colors.goldDark, borderRadius: radii.md,
    backgroundColor: colors.cream, padding: spacing.md, marginBottom: spacing.lg,
  },
  headerName: { fontFamily: fonts.fraunces.semiBold, fontSize: 18, color: colors.navyDark, marginBottom: 2 },
  headerHint: { fontFamily: fonts.inter.regular, fontSize: 11.5, color: colors.inkSoft },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4,
    marginBottom: spacing.sm,
  },
  actionRowDanger: { borderColor: colors.dangerSoft },
  actionLabel: { fontFamily: fonts.inter.medium, fontSize: 13.5, color: colors.navyDark },
  actionLabelDanger: { color: colors.danger },
  chevron: { fontFamily: fonts.inter.regular, fontSize: 16, color: colors.inkSoft },
});
