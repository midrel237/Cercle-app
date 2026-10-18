import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../src/components/AppButton';
import { colors, fonts, radii, spacing } from '../../src/theme';

/**
 * Écran 61 — Demande de prêt refusée : motif + proposition de redéposer
 * une demande plus faible (maquette).
 */
export default function LoanRejectedScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { amount } = useLocalSearchParams<{ amount?: string }>();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Text style={styles.icon}>✕</Text>
        <Text style={styles.title}>{t('loansScreen.rejectedTitle')}</Text>
        <Text style={styles.subtitle}>
          {t('loansScreen.rejectedSubtitle', {
            amount: Number(amount ?? 0).toLocaleString('fr-FR'),
          })}
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t('loansScreen.rejectedReasonLabel')}</Text>
          <Text style={styles.cardValue}>{t('loansScreen.rejectedReasonDefault')}</Text>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <AppButton
          label={t('loansScreen.newRequestButton')}
          onPress={() => router.replace('/loan/request')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.creamLight },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  icon: { fontSize: 42, color: colors.danger, marginBottom: spacing.md, fontFamily: fonts.inter.bold },
  title: { fontFamily: fonts.fraunces.semiBold, fontSize: 22, color: colors.navyDark, marginBottom: spacing.sm, textAlign: 'center' },
  subtitle: { fontFamily: fonts.inter.regular, fontSize: 12.5, color: colors.inkSoft, textAlign: 'center', lineHeight: 18, marginBottom: spacing.lg },
  card: {
    width: '100%', borderWidth: 1, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, padding: spacing.md,
  },
  cardLabel: { fontFamily: fonts.inter.medium, fontSize: 11, color: colors.goldDark, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.xs },
  cardValue: { fontFamily: fonts.inter.regular, fontSize: 12.5, color: colors.inkSoft, lineHeight: 18 },
  footer: { paddingHorizontal: spacing.md + 2 },
});
