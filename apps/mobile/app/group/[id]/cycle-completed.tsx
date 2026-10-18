import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../../src/components/AppButton';
import { colors, fonts, radii, spacing } from '../../../src/theme';

/**
 * Écran 71 — Célébration de cycle terminé : groupe, cycle bouclé sans
 * défaut, montant total distribué, taux de remboursement 100 %. Le
 * bouton « Démarrer un nouveau cycle » est affiché à l'admin (la logique
 * de relance des cycles suivra le même endpoint que le démarrage initial).
 */
export default function CycleCompletedScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id, name, cycle, distributed } = useLocalSearchParams<{
    id: string;
    name?: string;
    cycle?: string;
    distributed?: string;
  }>();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Text style={styles.icon}>🎉</Text>
        <Text style={styles.title}>{t('cycleCelebration.title')}</Text>
        <Text style={styles.subtitle}>
          {t('cycleCelebration.subtitle', {
            group: name ?? '',
            cycle: cycle ?? '',
          })}
        </Text>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>{t('cycleCelebration.distributedLabel')}</Text>
          <Text style={styles.statValue}>
            {Number(distributed ?? 0).toLocaleString('fr-FR')} FCFA
          </Text>
          <View style={styles.statDivider} />
          <Text style={styles.statLabel}>{t('cycleCelebration.repaymentRateLabel')}</Text>
          <Text style={[styles.statValue, { color: colors.success }]}>100 %</Text>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <AppButton
          label={t('cycleCelebration.newCycleButton')}
          onPress={() => router.replace({ pathname: '/group/[id]', params: { id } })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.creamLight },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  icon: { fontSize: 46, marginBottom: spacing.md },
  title: { fontFamily: fonts.fraunces.semiBold, fontSize: 24, color: colors.navyDark, marginBottom: spacing.sm, textAlign: 'center' },
  subtitle: { fontFamily: fonts.inter.regular, fontSize: 12.5, color: colors.inkSoft, textAlign: 'center', lineHeight: 18, marginBottom: spacing.xl },
  statCard: {
    width: '100%', borderWidth: 1.5, borderColor: colors.goldDark, borderRadius: radii.md,
    backgroundColor: colors.cream, padding: spacing.md, alignItems: 'center',
  },
  statLabel: { fontFamily: fonts.inter.medium, fontSize: 10.5, color: colors.goldDark, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  statValue: { fontFamily: fonts.mono.semiBold, fontSize: 24, color: colors.navyDark, marginBottom: spacing.md },
  statDivider: { width: '100%', height: 1, backgroundColor: colors.sand, marginBottom: spacing.md },
  footer: { paddingHorizontal: spacing.md + 2 },
});
