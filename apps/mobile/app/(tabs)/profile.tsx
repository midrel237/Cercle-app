import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usersApi } from '../../src/services/endpoints/account';
import { FadeIn, PopIn, CountUp, Stagger } from '../../src/components/motion';
import { colors, fonts, radii, spacing } from '../../src/theme';

interface Profile {
  id: string;
  phoneNumber: string;
  fullName: string | null;
  kycStatus: string;
  trustScore: number;
  language: string;
  activeGroups: number;
  paymentMethods: { id: string; type: string; provider: string | null }[];
  contributionsPaid: number;
  contributionsOnTime: number;
}

/**
 * Écran 72 — Profil & fiabilité : identité vérifiée, SCORE DE FIABILITÉ
 * (ressort + compteur), badge « Excellent » (maquette : 92/100 ·
 * Excellent · 14 cotisations sans retard), moyens de paiement, groupes
 * actifs, langue, notifications + liens.
 */
export default function ProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await usersApi.getProfile();
      setProfile(data);
      setError(null);
    } catch {
      setError(t('profileScreen.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const scoreColor = (score: number) =>
    score >= 80 ? colors.success : score >= 50 ? colors.goldDark : colors.danger;

  const link = (label: string, onPress: () => void) => (
    <Pressable style={styles.linkRow} onPress={onPress}>
      <Text style={styles.linkLabel}>{label}</Text>
      <Text style={styles.linkChevron}>›</Text>
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
        <FadeIn dy={10}>
          <Text style={styles.title}>{t('profileScreen.title')}</Text>
        </FadeIn>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator size="large" color={colors.goldDark} style={styles.spinner} />
        ) : profile ? (
          <>
            <FadeIn dy={8}>
              <Text style={styles.name}>{profile.fullName ?? t('profileScreen.unnamed')}</Text>
              <Text style={styles.kycLine}>
                {profile.kycStatus === 'VERIFIED'
                  ? `✓ ${t('profileScreen.identityVerified')}`
                  : t('profileScreen.identityPending')}{' '}
                · {profile.phoneNumber}
              </Text>
            </FadeIn>

            {/* Score de fiabilité — ressort + compteur + badge Excellent
                (maquette écran 72 : « Score de fiabilité — 92/100 —
                Excellent — 14 cotisations sans retard »). */}
            <PopIn delay={180}>
              <View style={styles.scoreCard}>
                <Text style={styles.scoreLabel}>{t('profileScreen.trustScoreLabel')}</Text>
                <CountUp
                  value={profile.trustScore}
                  suffix="/100"
                  duration={1100}
                  style={[styles.scoreValue, { color: scoreColor(profile.trustScore) }]}
                />
                {profile.trustScore >= 80 ? (
                  <Text style={[styles.scoreBadge, { color: colors.success }]}>
                    {t('profileScreen.trustScoreExcellent')}
                  </Text>
                ) : null}
                <Text style={styles.scoreDetail}>
                  {t('profileScreen.onTimeLine', {
                    onTime: profile.contributionsOnTime,
                    total: profile.contributionsPaid,
                  })}
                </Text>
              </View>
            </PopIn>

            <FadeIn delay={320} dy={12}>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t('profileScreen.paymentMethodsLabel')}</Text>
                  <Text style={styles.infoValue}>
                    {profile.paymentMethods
                      .map((m) => (m.type === 'MOBILE_MONEY' ? 'MoMo' : m.type === 'BANK_CARD' ? 'Carte' : 'Virement'))
                      .join(', ') || '—'}
                  </Text>
                </View>
                <View style={[styles.infoRow, styles.infoRowBorder]}>
                  <Text style={styles.infoLabel}>{t('profileScreen.groupsLabel')}</Text>
                  <Text style={styles.infoValue}>{profile.activeGroups}</Text>
                </View>
                <View style={[styles.infoRow, styles.infoRowBorder]}>
                  <Text style={styles.infoLabel}>{t('profileScreen.languageLabel')}</Text>
                  <Text style={styles.infoValue}>
                    {profile.language === 'EN' ? 'English' : 'Français'}
                  </Text>
                </View>
                <View style={[styles.infoRow, styles.infoRowBorder]}>
                  <Text style={styles.infoLabel}>{t('profileScreen.notificationsLabel')}</Text>
                  <Text style={styles.infoValue}>{t('profileScreen.notificationsEnabled')}</Text>
                </View>
              </View>
            </FadeIn>

            <Stagger step={70}>
              {link(t('profileScreen.securityLink'), () => {})}
              {link(t('profileScreen.editLink'), () => router.push('/settings/edit-profile'))}
              {link(t('profileScreen.settingsLink'), () => router.push('/settings'))}
              {link(t('profileScreen.helpLink'), () => router.push('/settings/help'))}
            </Stagger>
          </>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <Pressable onPress={() => router.push('/settings/logout-confirm')} style={styles.logoutButton}>
          <Text style={styles.logoutText}>{t('profileScreen.logout')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.creamLight },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  title: { fontFamily: fonts.fraunces.semiBold, fontSize: 24, color: colors.navyDark, marginBottom: spacing.md },
  errorText: { fontFamily: fonts.inter.medium, fontSize: 11.5, color: colors.danger, marginBottom: spacing.sm },
  spinner: { marginVertical: spacing.xl },
  name: { fontFamily: fonts.fraunces.semiBold, fontSize: 20, color: colors.navyDark, marginBottom: 2 },
  kycLine: { fontFamily: fonts.inter.regular, fontSize: 12, color: colors.inkSoft, marginBottom: spacing.lg },
  scoreCard: {
    borderWidth: 1.5, borderColor: colors.goldDark, borderRadius: radii.md,
    backgroundColor: colors.cream, padding: spacing.md, alignItems: 'center', marginBottom: spacing.lg,
  },
  scoreLabel: { fontFamily: fonts.inter.medium, fontSize: 10.5, color: colors.goldDark, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  scoreValue: { fontSize: 26, marginBottom: 2 },
  scoreBadge: { fontFamily: fonts.inter.semiBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  scoreDetail: { fontFamily: fonts.inter.regular, fontSize: 11.5, color: colors.inkSoft },
  infoCard: {
    borderWidth: 1, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md, marginBottom: spacing.lg,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm + 2 },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: colors.sand },
  infoLabel: { fontFamily: fonts.inter.regular, fontSize: 12.5, color: colors.inkSoft },
  infoValue: { fontFamily: fonts.inter.medium, fontSize: 12.5, color: colors.navyDark },
  linkRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4,
    marginBottom: spacing.sm,
  },
  linkLabel: { fontFamily: fonts.inter.medium, fontSize: 13, color: colors.navyDark },
  linkChevron: { fontFamily: fonts.inter.regular, fontSize: 16, color: colors.inkSoft },
  footer: { paddingHorizontal: spacing.md + 2 },
  logoutButton: { alignItems: 'center', paddingVertical: spacing.sm + 2 },
  logoutText: { fontFamily: fonts.inter.semiBold, fontSize: 13, color: colors.danger },
});
