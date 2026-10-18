import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
 * Écran 29 — Tirage au sort de l'ordre de rotation. Admin uniquement :
 * POST /groups/:id/rotation/draw attribue les positions (Fisher-Yates
 * côté backend), rejouable tant que les cycles ne sont pas démarrés.
 * « Valider cet ordre » mène à draw-result (écran 30) qui confirme.
 */
export default function DrawOrderScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [members, setMembers] = useState<OrderedMember[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDraw = useCallback(async () => {
    if (!id || drawing) return;
    setDrawing(true);
    setError(null);
    try {
      const { data } = await groupsApi.drawRotation(id);
      setMembers(data?.members ?? []);
    } catch {
      setError(t('drawOrder.drawError'));
    } finally {
      setDrawing(false);
    }
  }, [id, drawing, t]);

  // Premier tirage automatique à l'arrivée sur l'écran (UX maquette).
  useEffect(() => {
    if (id) runDraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleConfirm = () => {
    if (!id || members.length === 0) return;
    router.push({
      pathname: '/group/[id]/draw-result',
      params: { id },
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={router.back} hitSlop={12} style={styles.backRow}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </Pressable>

        <Text style={styles.title}>{t('drawOrder.title')}</Text>
        <Text style={styles.subtitle}>
          {t('drawOrder.membersCount', { count: members.length })}
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {drawing ? (
          <ActivityIndicator size="large" color={colors.goldDark} style={styles.spinner} />
        ) : (
          <View style={styles.orderList}>
            {members.map((m, i) => (
              <View key={m.id} style={styles.orderRow}>
                <View style={styles.positionBadge}>
                  <Text style={styles.positionText}>{i + 1}</Text>
                </View>
                <Text style={styles.memberName} numberOfLines={1}>
                  {m.user.fullName ?? t('drawOrder.unnamed')}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.hint}>{t('drawOrder.manualHint')}</Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <AppButton
          label={drawing ? t('drawOrder.drawing') : t('drawOrder.redrawButton')}
          variant="ghost"
          onPress={runDraw}
          disabled={drawing}
        />
        <AppButton
          label={t('drawOrder.confirmButton')}
          onPress={handleConfirm}
          disabled={drawing || members.length === 0}
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
  title: {
    fontFamily: fonts.fraunces.semiBold,
    fontSize: 24,
    color: colors.navyDark,
    marginBottom: spacing.xs + 2,
  },
  subtitle: {
    fontFamily: fonts.inter.regular,
    fontSize: 13,
    color: colors.inkSoft,
    marginBottom: spacing.lg,
  },
  errorText: {
    fontFamily: fonts.inter.medium,
    fontSize: 11.5,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  spinner: {
    marginVertical: spacing.xl,
  },
  orderList: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
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
  hint: {
    fontFamily: fonts.inter.regular,
    fontSize: 11.5,
    color: colors.inkSoft,
    lineHeight: 17,
  },
  footer: {
    paddingHorizontal: spacing.md + 2,
    gap: spacing.sm,
  },
});
