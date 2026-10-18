import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../../src/components/AppButton';
import { colors, fonts, radii, spacing } from '../../../src/theme';

/**
 * Écran 53 — Règlement de sortie (membre dont le tour est déjà passé).
 * Cagnotte reçue / déjà cotisé / solde dû → « Régler via Mobile Money »
 * pointe vers le flux paiement existant (pin-prompt). La transaction de
 * type MEMBER_EXIT_SETTLEMENT reste soumise au webhook agrégateur.
 * NB : prepareContribution ne gère pas encore ce type — extension
 * documentée dans la PR comme suite.
 */
export default function ExitSettlementScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id, name, potReceived, contributed, settleAmount } = useLocalSearchParams<{
    id: string;
    name?: string;
    potReceived?: string;
    contributed?: string;
    settleAmount?: string;
  }>();

  const pot = Number(potReceived ?? 0);
  const contrib = Number(contributed ?? 0);
  const settle = Number(settleAmount ?? 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Text style={styles.icon}>🚪</Text>
        <Text style={styles.title}>
          {t('membersScreen.settlementTitle', { name: name ?? '' })}
        </Text>
        <Text style={styles.subtitle}>{t('membersScreen.settlementSubtitle')}</Text>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>{t('membersScreen.settlementPot')}</Text>
            <Text style={styles.cardValue}>{pot.toLocaleString('fr-FR')} FCFA</Text>
          </View>
          <View style={[styles.cardRow, styles.cardRowBorder]}>
            <Text style={styles.cardLabel}>{t('membersScreen.settlementContributed')}</Text>
            <Text style={styles.cardValue}>{contrib.toLocaleString('fr-FR')} FCFA</Text>
          </View>
          <View style={[styles.cardRow, styles.cardRowBorder]}>
            <Text style={[styles.cardLabel, { color: colors.danger }]}>
              {t('membersScreen.settlementDue')}
            </Text>
            <Text style={[styles.cardValue, { color: colors.danger }]}>
              {settle.toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <AppButton
          label={t('membersScreen.settleButton', { amount: settle.toLocaleString('fr-FR') })}
          onPress={() =>
            router.replace({
              pathname: '/payment/pin-prompt',
              params: { groupId: id, amount: String(settle) },
            })
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.creamLight },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  icon: { fontSize: 42, marginBottom: spacing.md },
  title: { fontFamily: fonts.fraunces.semiBold, fontSize: 20, color: colors.navyDark, marginBottom: spacing.sm, textAlign: 'center' },
  subtitle: { fontFamily: fonts.inter.regular, fontSize: 12.5, color: colors.inkSoft, textAlign: 'center', lineHeight: 18, marginBottom: spacing.lg },
  card: {
    width: '100%', borderWidth: 1, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm + 2 },
  cardRowBorder: { borderTopWidth: 1, borderTopColor: colors.sand },
  cardLabel: { fontFamily: fonts.inter.regular, fontSize: 12.5, color: colors.inkSoft },
  cardValue: { fontFamily: fonts.mono.medium, fontSize: 12.5, color: colors.navyDark },
  footer: { paddingHorizontal: spacing.md + 2 },
});
