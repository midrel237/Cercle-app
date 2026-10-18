import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../../src/components/AppButton';
import { groupsApi } from '../../../src/services/endpoints/groups';
import { colors, fonts, spacing } from '../../../src/theme';

/**
 * Écran 45 — Retirer un membre (admin). Confirmation : le membre ne
 * pourra plus cotiser ni recevoir la rotation ; son historique reste
 * visible (traçabilité — aucune ligne du ledger n'est supprimée).
 */
export default function RemoveMemberConfirmScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id, memberId, name } = useLocalSearchParams<{ id: string; memberId: string; name?: string }>();

  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRemove = async () => {
    if (!id || !memberId || removing) return;
    setRemoving(true);
    setError(null);
    try {
      await groupsApi.removeMember(id, memberId);
      router.replace({ pathname: '/group/[id]/members', params: { id } });
    } catch {
      setError(t('membersScreen.removeError'));
      setRemoving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Text style={styles.icon}>🚪</Text>
        <Text style={styles.title}>{t('membersScreen.removeTitle', { name: name ?? '' })}</Text>
        <Text style={styles.subtitle}>{t('membersScreen.removeSubtitle')}</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <AppButton label={t('common.cancel')} variant="ghost" onPress={router.back} disabled={removing} />
        <AppButton
          label={removing ? t('membersScreen.removing') : t('membersScreen.removeConfirm')}
          onPress={handleRemove}
          disabled={removing}
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
  errorText: { fontFamily: fonts.inter.medium, fontSize: 11.5, color: colors.danger, textAlign: 'center' },
  footer: { paddingHorizontal: spacing.md + 2, gap: spacing.sm },
});
