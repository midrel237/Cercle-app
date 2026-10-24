import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Share, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../../src/components/AppButton';
import { FadeIn, PopIn, Stagger } from '../../../src/components/motion';
import { groupsApi } from '../../../src/services/endpoints/groups';
import { colors, fonts, radii, spacing } from '../../../src/theme';

/** Miroir de GET /groups/:id — champs affichés par le récapitulatif. */
interface GroupSummary {
  id: string;
  name: string;
  mode: string;
  contributionAmount: string;
  periodicityDays: number;
  penaltyRules: string | null;
  openToDiaspora: boolean;
  memberCount: number;
  inviteCode: string;
}

const MODE_LABEL: Record<string, string> = {
  ROTATIVE: 'Rotative',
  INTERNAL_LOAN: 'Prêts internes',
  MIXED: 'Rotatif + Prêts internes',
};

/**
 * Écran 25 — Récapitulatif de création (maquette) : le groupe vient
 * d'être créé par POST /groups (étape Règles). Affiche les règles
 * réelles relues depuis GET /groups/:id (vérité serveur), puis
 * « Découvrir le groupe ». Intègre l'écran 24 (Inviter) : code
 * d'invitation + partage natif.
 *
 * Micro-animations : PopIn sur le titre, cascade (Stagger) sur les
 * lignes du récapitulatif.
 */
export default function CreateGroupSummaryScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ groupId?: string }>();

  const [group, setGroup] = useState<GroupSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!params.groupId) return;
    try {
      const { data } = await groupsApi.getOne(params.groupId);
      setGroup(data);
      setError(null);
    } catch {
      setError(t('createGroupInvite.loadError'));
    } finally {
      setLoading(false);
    }
  }, [params.groupId, t]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.goldDark} />
      </View>
    );
  }

  const modeLabel = group?.mode != null ? MODE_LABEL[group.mode] ?? group.mode : '';

  const row = (label: string, value: string, last = false) => (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <PopIn>
          <Text style={styles.checkMark}>✓</Text>
          <Text style={styles.title}>{t('createGroupSummary.title')}</Text>
          <Text style={styles.subtitle}>{t('createGroupSummary.subtitle')}</Text>
        </PopIn>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Stagger step={60}>
          <FadeIn dy={10}>
            <View style={styles.card}>
              {row(t('createGroupSummary.summaryName'), group?.name ?? '—')}
              {row(
                t('createGroupSummary.summaryAmount'),
                `${Number(group?.contributionAmount ?? 0).toLocaleString('fr-FR')} FCFA · ${t(
                  'createGroup.step3.periodicityDays',
                  { count: group?.periodicityDays ?? 0 },
                )}`,
              )}
              {row(t('createGroupSummary.summaryMode'), modeLabel || '—')}
              {row(t('createGroupSummary.summaryMembers'), String(group?.memberCount ?? 1))}
              {row(
                t('createGroupSummary.summaryPenalty'),
                group?.penaltyRules ?? t('createGroupSummary.summaryPenaltyNone'),
              )}
              {row(
                t('createGroupSummary.summaryDiaspora'),
                group?.openToDiaspora
                  ? t('groupSettings.diasporaYes')
                  : t('groupSettings.diasporaNo'),
                true,
              )}
            </View>
          </FadeIn>

          {/* Écran 24 — Inviter : code d'invitation + partage natif. */}
          <FadeIn delay={160} dy={10}>
            <View style={styles.inviteCard}>
              <Text style={styles.inviteCodeLabel}>{t('createGroupInvite.codeLabel')}</Text>
              <Text style={styles.inviteCode}>{group?.inviteCode ?? '—'}</Text>
              <Text style={styles.inviteHint}>{t('createGroupInvite.subtitle')}</Text>
              <AppButton
                label={t('createGroupInvite.shareLabel')}
                onPress={() =>
                  Share.share({
                    message: t('createGroupInvite.shareMessage', {
                      code: group?.inviteCode ?? '',
                    }),
                  })
                }
                style={styles.shareButton}
              />
            </View>
          </FadeIn>
        </Stagger>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <AppButton
          label={t('createGroupSummary.startButton')}
          onPress={() => router.replace(`/group/${params.groupId}`)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.creamLight },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, paddingHorizontal: spacing.md },
  checkMark: {
    fontSize: 40,
    color: colors.success,
    fontFamily: fonts.inter.bold,
    textAlign: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.fraunces.semiBold,
    fontSize: 24,
    color: colors.navyDark,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fonts.inter.regular,
    fontSize: 12.5,
    color: colors.inkSoft,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.xl,
  },
  errorText: {
    fontFamily: fonts.inter.medium,
    fontSize: 11.5,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  card: {
    borderWidth: 1, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: spacing.md, paddingVertical: spacing.sm + 2,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.sand },
  rowLabel: { flex: 1, fontFamily: fonts.inter.regular, fontSize: 12.5, color: colors.inkSoft },
  rowValue: { flex: 1.2, fontFamily: fonts.mono.medium, fontSize: 12.5, color: colors.navyDark, textAlign: 'right' },
  inviteCard: {
    borderWidth: 1.5, borderColor: colors.goldDark, borderRadius: radii.md,
    backgroundColor: colors.cream, padding: spacing.md, alignItems: 'center',
  },
  inviteCodeLabel: {
    fontFamily: fonts.inter.medium, fontSize: 10.5, color: colors.goldDark,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.xs,
  },
  inviteCode: {
    fontFamily: fonts.mono.semiBold, fontSize: 26, color: colors.navyDark,
    letterSpacing: 3, marginBottom: spacing.sm,
  },
  inviteHint: {
    fontFamily: fonts.inter.regular, fontSize: 11.5, color: colors.inkSoft,
    textAlign: 'center', lineHeight: 16, marginBottom: spacing.md,
  },
  shareButton: { alignSelf: 'stretch' },
  footer: { paddingHorizontal: spacing.md + 2 },
});
