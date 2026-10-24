import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radii, spacing } from '../../src/theme';

/**
 * Écran 74 — Paramètres : Général (Langue, Notifications, Sécurité & PIN)
 * et Compte (SMS de secours, Supprimer mon compte, Se déconnecter).
 * « Sécurité & PIN » ouvre l'écran 20 (modifier le PIN via OTP,
 * biométrie, appareils connectés).
 */
export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();

  const row = (label: string, value: string | null, onPress: (() => void) | null, danger = false) => (
    <Pressable style={styles.row} onPress={onPress ?? undefined} disabled={!onPress}>
      <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {onPress ? <Text style={styles.chevron}>›</Text> : null}
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Pressable onPress={router.back} hitSlop={12} style={styles.backRow}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </Pressable>

        <Text style={styles.title}>{t('settingsScreen.title')}</Text>

        <Text style={styles.sectionTitle}>{t('settingsScreen.generalSection')}</Text>
        <View style={styles.card}>
          {row(t('settingsScreen.languageRow'), i18n.language === 'en' ? 'English' : 'Français', null)}
          {row(t('settingsScreen.notificationsRow'), t('settingsScreen.enabledValue'), null)}
          {row(t('settingsScreen.securityRow'), null, () => router.push('/settings/security'))}
        </View>

        <Text style={styles.sectionTitle}>{t('settingsScreen.accountSection')}</Text>
        <View style={styles.card}>
          {row(t('settingsScreen.backupSmsRow'), t('settingsScreen.enabledValue'), null)}
          {row(t('settingsScreen.deleteAccountRow'), null, () => {}, true)}
          {row(t('settingsScreen.logoutRow'), null, () => router.push('/settings/logout-confirm'), true)}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.creamLight },
  content: { flex: 1, paddingHorizontal: spacing.md },
  backRow: { alignSelf: 'flex-start', marginTop: spacing.sm, marginBottom: spacing.md },
  backText: { fontFamily: fonts.inter.medium, fontSize: 13, color: colors.navy },
  title: { fontFamily: fonts.fraunces.semiBold, fontSize: 24, color: colors.navyDark, marginBottom: spacing.lg },
  sectionTitle: { fontFamily: fonts.fraunces.semiBold, fontSize: 15, color: colors.navyDark, marginBottom: spacing.sm },
  card: {
    borderWidth: 1, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md, marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm + 4, gap: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.sand,
  },
  rowLabel: { flex: 1, fontFamily: fonts.inter.medium, fontSize: 13, color: colors.navyDark },
  rowLabelDanger: { color: colors.danger },
  rowValue: { fontFamily: fonts.inter.regular, fontSize: 12, color: colors.inkSoft },
  chevron: { fontFamily: fonts.inter.regular, fontSize: 16, color: colors.inkSoft },
});
