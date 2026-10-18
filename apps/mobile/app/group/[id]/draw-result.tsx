import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../../src/components/AppButton';
import { groupsApi } from '../../../src/services/endpoints/groups';
import { colors, fonts, radii, spacing } from '../../../src/theme';

interface OrderedMember {
  id: string;
  rotationPosition: number | null;
  user: { id: string; fullName: string | null };
}

/**
 * Écran 30 — Ordre confirmé + démarrage du cycle 1. Charge l'ordre via
 * GET /groups/:id, le verrouille (POST rotation/confirm) puis permet
 * « Démarrer le cycle 1 » (POST cycles/start) qui crée les N cycles à
 * partir de l'ordre, le cycle 1 passant actif.
 */
export default function DrawResultScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [members, setMembers] = useState<OrderedMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      try {
        await groupsApi.confirmRotation(id);
        const { data } = await groupsApi.getOne(id);
        if (!cancelled) {
          setMembers(
            (data?.members ?? [])
              .filter((m: OrderedMember) => m.rotationPosition !== null)
              .sort(
                (a: OrderedMember, b: OrderedMember) =>
                  (a.rotationPosition ?? 0) - (b.rotationPosition ?? 0),
              ),
          );
        }
      } catch {
        if (!cancelled) setError(t('drawResult.loadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  const handleStart = async () => {
    if (!id || starting) return;
    setStarting(true);
    setError(null);
    try {
      await groupsApi.startCycles(id);
      router.replace({
        pathname: '/group/[id]',
        params: { id },
      });
    } catch {
      setError(t('drawResult.startError'));
      setStarting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.title}>{t('drawResult.title')}</Text>
        <Text style={styles.subtitle}>{t('drawResult.subtitle')}</Text>

        {loading ? (
          <ActivityIndicator size="large" color={colors.goldDark} style={styles.spinner} />
        ) : (
          <View style={styles.orderList}>
            {members.map((m, i) => (
              <View key={m.id} style={styles.orderRow}>
                <View style={styles.positionBadge}>
                  <Text style={styles.positionText}>{i + 1}</Text>
                </View>
                <Text style={styles.memberName} numberOfLines={1}>
                  {m.user.fullName ?? t('drawResult.unnamed')}
                </Text>
              </View>
            ))}
          </View>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <AppButton
          label={starting ? t('drawResult.starting') : t('drawResult.startButton')}
          onPress={handleStart}
          disabled={loading || starting || members.length === 0}
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
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  emoji: {
    fontSize: 42,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.fraunces.semiBold,
    fontSize: 22,
    color: colors.navyDark,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.inter.regular,
    fontSize: 12.5,
    color: colors.inkSoft,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  spinner: {
    marginVertical: spacing.xl,
  },
  orderList: {
    width: '100%',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.sand,
    borderRadius: radii.md,
    backgroundColor: colors.creamLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  positionBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionText: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 13,
    color: colors.white,
  },
  memberName: {
    flex: 1,
    fontFamily: fonts.inter.medium,
    fontSize: 14,
    color: colors.navyDark,
  },
  errorText: {
    fontFamily: fonts.inter.medium,
    fontSize: 11.5,
    color: colors.danger,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing.md + 2,
  },
});
