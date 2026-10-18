import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../../../src/components/AppButton';
import { eventsApi, GroupEventType } from '../../../../src/services/endpoints/events';
import { colors, fonts, radii, spacing } from '../../../../src/theme';

const TYPE_LABEL: Record<GroupEventType, string> = {
  DEUIL: 'Deuil',
  ANNIVERSAIRE: 'Anniversaire',
  NAISSANCE: 'Naissance',
  MARIAGE: 'Mariage',
  MALADIE: 'Maladie',
  AUTRE: 'Autre',
};

interface EventRow {
  id: string;
  type: GroupEventType;
  customLabel: string | null;
  description: string | null;
  suggestedAmount: string | null;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  closedAt: string | null;
  beneficiary: { id: string; fullName: string | null };
  collectedAmount: number;
  contributorsCount: number;
  remainingMembers: number;
}

/**
 * Écran 54 — Évènements du groupe : cagnottes ouvertes (collecté,
 * suggestion / membre, contributeurs, restants) puis clôturées.
 */
export default function EventsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await eventsApi.listForGroup(id);
      setEvents(data?.events ?? []);
      setError(null);
    } catch {
      setError(t('eventsScreen.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  const open = events.filter((e) => e.status === 'OPEN');
  const closed = events.filter((e) => e.status === 'CLOSED');

  const card = (e: EventRow) => (
    <Pressable
      key={e.id}
      style={[styles.eventCard, e.status === 'CLOSED' && styles.eventCardClosed]}
      onPress={() =>
        router.push({
          pathname: '/group/[id]/events/[eventId]/contribute',
          params: { id, eventId: e.id },
        })
      }
    >
      <Text style={styles.eventType}>{TYPE_LABEL[e.type]}</Text>
      <Text style={styles.eventTitle} numberOfLines={1}>
        {e.customLabel ?? e.beneficiary?.fullName ?? t('eventsScreen.unnamedBeneficiary')}
      </Text>
      <Text style={styles.eventMeta}>
        {t('eventsScreen.collectedLabel', {
          amount: e.collectedAmount.toLocaleString('fr-FR'),
        })}
        {e.suggestedAmount
          ? ` · ${t('eventsScreen.suggestionLabel', {
              amount: Number(e.suggestedAmount).toLocaleString('fr-FR'),
            })}`
          : ''}
      </Text>
      {e.status === 'OPEN' ? (
        <Text style={styles.eventProgress}>
          {t('eventsScreen.contributorsLabel', {
            count: e.contributorsCount,
            remaining: e.remainingMembers,
          })}
        </Text>
      ) : (
        <Text style={styles.eventClosed}>
          {e.closedAt
            ? t('eventsScreen.closedOnLabel', {
                date: new Date(e.closedAt).toLocaleDateString('fr-FR'),
              })
            : t('eventsScreen.closedLabel')}
        </Text>
      )}
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
        <Pressable onPress={router.back} hitSlop={12} style={styles.backRow}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </Pressable>

        <Text style={styles.title}>{t('eventsScreen.title')}</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator size="large" color={colors.goldDark} style={styles.spinner} />
        ) : (
          <>
            {open.length > 0 ? (
              <View style={styles.section}>{open.map(card)}</View>
            ) : (
              <Text style={styles.emptyText}>{t('eventsScreen.noOpenEvents')}</Text>
            )}

            {closed.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('eventsScreen.closedSection')}</Text>
                {closed.map(card)}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <AppButton
          label={t('eventsScreen.createButton')}
          onPress={() => router.push({ pathname: '/group/[id]/events/create', params: { id } })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.creamLight },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  backRow: { alignSelf: 'flex-start', marginTop: spacing.sm, marginBottom: spacing.md },
  backText: { fontFamily: fonts.inter.medium, fontSize: 13, color: colors.navy },
  title: { fontFamily: fonts.fraunces.semiBold, fontSize: 24, color: colors.navyDark, marginBottom: spacing.lg },
  errorText: { fontFamily: fonts.inter.medium, fontSize: 11.5, color: colors.danger, marginBottom: spacing.sm },
  spinner: { marginVertical: spacing.xl },
  emptyText: { fontFamily: fonts.inter.regular, fontSize: 12.5, color: colors.inkSoft, textAlign: 'center', marginTop: spacing.xl },
  section: { marginBottom: spacing.lg },
  sectionTitle: { fontFamily: fonts.fraunces.semiBold, fontSize: 15, color: colors.navyDark, marginBottom: spacing.sm },
  eventCard: {
    borderWidth: 1.5, borderColor: colors.gold, borderRadius: radii.md,
    backgroundColor: colors.cream, padding: spacing.md, marginBottom: spacing.sm,
  },
  eventCardClosed: { borderColor: colors.sand, backgroundColor: colors.creamLight },
  eventType: { fontFamily: fonts.inter.medium, fontSize: 10.5, color: colors.goldDark, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  eventTitle: { fontFamily: fonts.inter.semiBold, fontSize: 15, color: colors.navyDark, marginBottom: 2 },
  eventMeta: { fontFamily: fonts.mono.medium, fontSize: 11.5, color: colors.inkSoft, marginBottom: 2 },
  eventProgress: { fontFamily: fonts.inter.regular, fontSize: 11.5, color: colors.inkSoft },
  eventClosed: { fontFamily: fonts.inter.regular, fontSize: 11, color: colors.inkSoft, fontStyle: 'italic' },
  footer: { paddingHorizontal: spacing.md + 2 },
});
