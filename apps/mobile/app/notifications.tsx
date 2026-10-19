import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationsApi } from '../src/services/endpoints/account';
import { colors, fonts, radii, spacing } from '../src/theme';

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

/**
 * Écran 70 — Notifications : alertes de l'utilisateur (cotisation à
 * venir, prêt approuvé, membre en retard, versement reçu, échéance de
 * remboursement...). Appui → marquée lue.
 */
export default function NotificationsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await notificationsApi.list();
      setItems(data ?? []);
      setError(null);
    } catch {
      setError(t('notificationsScreen.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePress = async (n: NotificationRow) => {
    if (n.isRead) return;
    try {
      await notificationsApi.markRead(n.id);
      setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, isRead: true } : i)));
    } catch {
      // Silencieux : la marque de lecture est best-effort.
    }
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return t('notificationsScreen.justNow');
    if (hours < 24) return t('notificationsScreen.hoursAgo', { count: hours });
    // Plus d'un jour : date complète plutôt qu'un compteur de jours.
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
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

        <Text style={styles.title}>{t('notificationsScreen.title')}</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator size="large" color={colors.goldDark} style={styles.spinner} />
        ) : items.length === 0 ? (
          <Text style={styles.emptyText}>{t('notificationsScreen.empty')}</Text>
        ) : (
          items.map((n) => (
            <Pressable
              key={n.id}
              style={[styles.notifCard, !n.isRead && styles.notifCardUnread]}
              onPress={() => handlePress(n)}
            >
              <View style={styles.notifHeader}>
                <Text style={styles.notifTitle} numberOfLines={1}>
                  {n.title}
                </Text>
                {!n.isRead ? <View style={styles.unreadDot} /> : null}
              </View>
              <Text style={styles.notifBody}>{n.body}</Text>
              <Text style={styles.notifTime}>{timeAgo(n.createdAt)}</Text>
            </Pressable>
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
  title: { fontFamily: fonts.fraunces.semiBold, fontSize: 24, color: colors.navyDark, marginBottom: spacing.lg },
  errorText: { fontFamily: fonts.inter.medium, fontSize: 11.5, color: colors.danger, marginBottom: spacing.sm },
  spinner: { marginVertical: spacing.xl },
  emptyText: { fontFamily: fonts.inter.regular, fontSize: 12.5, color: colors.inkSoft, textAlign: 'center', marginTop: spacing.xl },
  notifCard: {
    borderWidth: 1, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, padding: spacing.md, marginBottom: spacing.sm,
  },
  notifCardUnread: { borderColor: colors.gold },
  notifHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  notifTitle: { flex: 1, fontFamily: fonts.inter.semiBold, fontSize: 13.5, color: colors.navyDark },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.goldDark },
  notifBody: { fontFamily: fonts.inter.regular, fontSize: 12, color: colors.inkSoft, lineHeight: 17, marginBottom: spacing.xs },
  notifTime: { fontFamily: fonts.inter.regular, fontSize: 10.5, color: colors.inkSoft },
});
