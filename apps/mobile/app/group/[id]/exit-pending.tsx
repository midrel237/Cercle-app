import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radii, spacing } from '../../../src/theme';

/**
 * Écran 51 — Demande de sortie envoyée. Statut « En attente » + montant
 * concerné : remboursement (tour non passé) ou solde à régler (tour reçu).
 */
export default function ExitPendingScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { amount, received } = useLocalSearchParams<{ amount?: string; received?: string }>();

  const amountNum = Number(amount ?? 0);
  const rotationReceived = received === 'true';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Text style={styles.icon}>⏳</Text>
        <Text style={styles.title}>{t('membersScreen.leavePendingTitle')}</Text>
        <Text style={styles.subtitle}>{t('membersScreen.leavePendingSubtitle')}</Text>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>{t('membersScreen.leavePendingStatus')}</Text>
            <Text style={styles.cardStatus}>{t('membersScreen.leavePendingWaiting')}</Text>
          </View>
          <View style={[styles.cardRow, styles.cardRowBorder]}>
            <Text style={styles.cardLabel}>
              {rotationReceived
                ? t('membersScreen.leavePendingSettle')
                : t('membersScreen.leavePendingRefund')}
            </Text>
            <Text style={styles.cardValue}>
              {amountNum.toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.creamLight },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  icon: { fontSize: 42, marginBottom: spacing.md },
  title: { fontFamily: fonts.fraunces.semiBold, fontSize: 22, color: colors.navyDark, marginBottom: spacing.sm, textAlign: 'center' },
  subtitle: { fontFamily: fonts.inter.regular, fontSize: 12.5, color: colors.inkSoft, textAlign: 'center', lineHeight: 18, marginBottom: spacing.xl },
  card: {
    width: '100%', borderWidth: 1, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm + 2 },
  cardRowBorder: { borderTopWidth: 1, borderTopColor: colors.sand },
  cardLabel: { fontFamily: fonts.inter.regular, fontSize: 12.5, color: colors.inkSoft },
  cardStatus: { fontFamily: fonts.inter.semiBold, fontSize: 12.5, color: colors.goldDark },
  cardValue: { fontFamily: fonts.inter.semiBold, fontSize: 12.5, color: colors.goldDark },
});
