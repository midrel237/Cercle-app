import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../src/components/AppButton';
import { useAuthStore } from '../../src/store/auth.store';
import { colors, fonts, spacing } from '../../src/theme';

/**
 * Écran 76 — Se déconnecter : confirmation — le code PIN sera redemandé à
 * la prochaine connexion (le token est purgé du store + storage local).
 */
export default function LogoutConfirmScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Text style={styles.icon}>🚪</Text>
        <Text style={styles.title}>{t('settingsScreen.logoutConfirmTitle')}</Text>
        <Text style={styles.subtitle}>{t('settingsScreen.logoutConfirmSubtitle')}</Text>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <AppButton label={t('common.cancel')} variant="ghost" onPress={router.back} />
        <AppButton
          label={t('settingsScreen.logoutRow')}
          onPress={handleLogout}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.creamLight },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  icon: { fontSize: 42, marginBottom: spacing.md },
  title: { fontFamily: fonts.fraunces.semiBold, fontSize: 22, color: colors.navyDark, marginBottom: spacing.sm, textAlign: 'center' },
  subtitle: { fontFamily: fonts.inter.regular, fontSize: 12.5, color: colors.inkSoft, textAlign: 'center', lineHeight: 18 },
  footer: { paddingHorizontal: spacing.md + 2, gap: spacing.sm },
});
