import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { groupsApi } from '../../../../src/services/endpoints/groups';
import { FadeIn, PopIn, CountUp } from '../../../../src/components/motion';
import { colors, fonts, radii, spacing } from '../../../../src/theme';

interface MemberProfile {
  id: string;
  fullName: string | null;
  trustScore: number;
  role: string;
  joinedAt: string;
  contributionsPaid: number;
  contributionsPaidOnTime: number;
  totalCycles: number;
  receivedRotation: number | null;
  loansTotal: number;
  loansRepaid: number;
  outstandingDebt: string;
}

/**
 * Écran 46 — Profil d'un membre : SCORE DE FIABILITÉ (User.trustScore)
 * + métriques calculées par le backend depuis le ledger : cotisations
 * payées à temps, prêts remboursés intégralement, tour de rotation reçu.
 *
 * Micro-animations : le score arrive en ressort (PopIn) et compte de 0 à
 * sa valeur ; les cartes apparaissent en fondu décalé (FadeIn).
 */
export default function MemberProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id, memberId } = useLocalSearchParams<{ id: string; memberId: string }>();

  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !memberId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await groupsApi.getMemberProfile(id, memberId);
        if (!cancelled) setProfile(data);
      } catch {
        if (!cancelled) setError(t('membersScreen.profileLoadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, memberId, t]);

  const scoreColor = (score: number) =>
    score >= 80 ? colors.success : score >= 50 ? colors.goldDark : colors.danger;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Pressable onPress={router.back} hitSlop={12} style={styles.backRow}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </Pressable>

        {loading ? (
          <ActivityIndicator size="large" color={colors.goldDark} style={styles.spinner} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : profile ? (
          <>
            <FadeIn dy={10}>
              <Text style={styles.name}>{profile.fullName ?? t('membersScreen.unnamed')}</Text>
              <Text style={styles.since}>
                {t('membersScreen.memberSince', {
                  date: new Date(profile.joinedAt).toLocaleDateString('fr-FR', {
                    month: 'long',
                    year: 'numeric',
                  }),
                })}
              </Text>
            </FadeIn>

            {/* Score de fiabilité — ressort + compteur (motif signature). */}
            <PopIn delay={200}>
              <View style={styles.scoreCard}>
                <Text style={styles.scoreLabel}>{t('membersScreen.trustScoreLabel')}</Text>
                <CountUp
                  value={profile.trustScore}
                  suffix="/100"
                  duration={1100}
                  style={[styles.scoreValue, { color: scoreColor(profile.trustScore) }]}
                />
                <Text style={styles.scoreDetail}>
                  {t('membersScreen.onTimeContributions', {
                    onTime: profile.contributionsPaidOnTime,
                    total: profile.contributionsPaid,
                  })}
                </Text>
              </View>
            </PopIn>

            <FadeIn delay={320} dy={12}>
              <View style={styles.metricsCard}>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>{t('membersScreen.metricOnTime')}</Text>
                  <Text style={styles.metricValue}>
                    {profile.contributionsPaidOnTime} / {profile.contributionsPaid}
                  </Text>
                </View>
                <View style={[styles.metricRow, styles.metricRowBorder]}>
                  <Text style={styles.metricLabel}>{t('membersScreen.metricLoansRepaid')}</Text>
                  <Text style={styles.metricValue}>
                    {profile.loansRepaid} / {profile.loansTotal}
                  </Text>
                </View>
                <View style={[styles.metricRow, styles.metricRowBorder]}>
                  <Text style={styles.metricLabel}>{t('membersScreen.metricRotation')}</Text>
                  <Text style={styles.metricValue}>
                    {profile.receivedRotation !== null
                      ? t('membersScreen.rotationYes', { cycle: profile.receivedRotation })
                      : t('membersScreen.rotationNo')}
                  </Text>
                </View>
                {Number(profile.outstandingDebt) > 0 ? (
                  <View style={[styles.metricRow, styles.metricRowBorder]}>
                    <Text style={styles.metricLabel}>{t('membersScreen.metricDebt')}</Text>
                    <Text style={[styles.metricValue, { color: colors.danger }]}>
                      {Number(profile.outstandingDebt).toLocaleString('fr-FR')} FCFA
                    </Text>
                  </View>
                ) : null}
              </View>
            </FadeIn>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.creamLight },
  content: { flex: 1, paddingHorizontal: spacing.md },
  backRow: { alignSelf: 'flex-start', marginTop: spacing.sm, marginBottom: spacing.md },
  backText: { fontFamily: fonts.inter.medium, fontSize: 13, color: colors.navy },
  spinner: { marginVertical: spacing.xl },
  errorText: { fontFamily: fonts.inter.medium, fontSize: 11.5, color: colors.danger, textAlign: 'center', marginTop: spacing.lg },
  name: { fontFamily: fonts.fraunces.semiBold, fontSize: 22, color: colors.navyDark, marginBottom: 2 },
  since: { fontFamily: fonts.inter.regular, fontSize: 12, color: colors.inkSoft, marginBottom: spacing.lg },
  scoreCard: {
    borderWidth: 1.5, borderColor: colors.goldDark, borderRadius: radii.md,
    backgroundColor: colors.cream, padding: spacing.md, alignItems: 'center', marginBottom: spacing.lg,
  },
  scoreLabel: { fontFamily: fonts.inter.medium, fontSize: 10.5, color: colors.goldDark, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.xs },
  scoreValue: { fontSize: 28, marginBottom: 2 },
  scoreDetail: { fontFamily: fonts.inter.regular, fontSize: 11.5, color: colors.inkSoft },
  metricsCard: {
    borderWidth: 1, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md,
  },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm + 2 },
  metricRowBorder: { borderTopWidth: 1, borderTopColor: colors.sand },
  metricLabel: { fontFamily: fonts.inter.regular, fontSize: 12.5, color: colors.inkSoft },
  metricValue: { fontFamily: fonts.mono.medium, fontSize: 12.5, color: colors.navyDark },
});
