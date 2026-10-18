import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../src/components/AppButton';
import { FadeIn, PopIn } from '../../src/components/motion';
import { colors, fonts, radii, spacing } from '../../src/theme';

/**
 * Écran 60 — Demande de prêt approuvée : montant, prochaine étape =
 * signature du contrat (écrans 62-63). Le badge de succès arrive en
 * ressort (PopIn), les cartes en fondu décalé.
 */
export default function LoanApprovedScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { loanId, amount } = useLocalSearchParams<{ loanId?: string; amount?: string }>();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <PopIn scale={0.4}>
          <View style={styles.badge}>
            <Text style={styles.badgeIcon}>✓</Text>
          </View>
        </PopIn>
        <FadeIn delay={180}>
          <Text style={styles.title}>{t('loansScreen.approvedTitle')}</Text>
          <Text style={styles.subtitle}>
            {t('loansScreen.approvedSubtitle', {
              amount: Number(amount ?? 0).toLocaleString('fr-FR'),
            })}
          </Text>
        </FadeIn>

        <FadeIn delay={320} dy={12}>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>{t('loansScreen.amountLabel')}</Text>
              <Text style={styles.cardValue}>
                {Number(amount ?? 0).toLocaleString('fr-FR')} FCFA
              </Text>
            </View>
            <View style={[styles.cardRow, styles.cardRowBorder]}>
              <Text style={styles.cardLabel}>{t('loansScreen.nextStepLabel')}</Text>
              <Text style={styles.cardValue}>{t('loansScreen.contractSignatureStep')}</Text>
            </View>
          </View>
        </FadeIn>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <AppButton
          label={t('loansScreen.signContractButton')}
          onPress={() =>
            loanId
              ? router.replace(`/loan/${loanId}/contract`)
              : router.replace('/(tabs)/loans')
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.creamLight },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  badge: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  badgeIcon: { fontSize: 32, color: colors.white, fontFamily: fonts.inter.bold },
  title: { fontFamily: fonts.fraunces.semiBold, fontSize: 22, color: colors.navyDark, marginBottom: spacing.sm, textAlign: 'center' },
  subtitle: { fontFamily: fonts.inter.regular, fontSize: 12.5, color: colors.inkSoft, textAlign: 'center', lineHeight: 18, marginBottom: spacing.lg },
  card: {
    width: '100%', borderWidth: 1, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm + 2 },
  cardRowBorder: { borderTopWidth: 1, borderTopColor: colors.sand },
  cardLabel: { fontFamily: fonts.inter.regular, fontSize: 12.5, color: colors.inkSoft },
  cardValue: { fontFamily: fonts.inter.semiBold, fontSize: 12.5, color: colors.navyDark },
  footer: { paddingHorizontal: spacing.md + 2 },
});
