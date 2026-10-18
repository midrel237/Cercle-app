import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../../src/components/AppButton';
import { groupsApi } from '../../../src/services/endpoints/groups';
import { useAuthStore } from '../../../src/store/auth.store';
import { colors, fonts, radii, spacing } from '../../../src/theme';

interface MemberRow {
  id: string;
  userId: string;
  fullName: string | null;
  role: string;
}

/**
 * Écran 48 — Désigner le caissier. Sélection d'un membre actif puis
 * confirmation : « Confirmer {nom} comme caissier·ère » → POST cashier.
 * Le caissier reste membre cotisant à part entière (Option A §7).
 */
export default function AssignCashierScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [selected, setSelected] = useState<MemberRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await groupsApi.listMembers(id);
        if (!cancelled) setMembers(data?.members ?? []);
      } catch {
        if (!cancelled) setError(t('membersScreen.loadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  const handleConfirm = async () => {
    if (!id || !selected || saving) return;
    setSaving(true);
    setError(null);
    try {
      await groupsApi.assignCashier(id, selected.id);
      router.replace({ pathname: '/group/[id]/deposit-account', params: { id } });
    } catch {
      setError(t('membersScreen.assignCashierError'));
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Pressable onPress={router.back} hitSlop={12} style={styles.backRow}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </Pressable>

        <Text style={styles.title}>{t('membersScreen.assignCashierTitle')}</Text>
        <Text style={styles.subtitle}>{t('membersScreen.assignCashierHint')}</Text>

        {loading ? (
          <ActivityIndicator size="large" color={colors.goldDark} style={styles.spinner} />
        ) : (
          <View style={styles.list}>
            {members.map((m) => (
              <Pressable
                key={m.id}
                style={[styles.memberRow, selected?.id === m.id && styles.memberRowSelected]}
                onPress={() => setSelected(m)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(m.fullName ?? '?').charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.memberName} numberOfLines={1}>
                  {m.fullName ?? t('membersScreen.unnamed')}
                  {m.userId === user?.id ? t('membersScreen.youSuffix') : ''}
                </Text>
                <View style={[styles.radio, selected?.id === m.id && styles.radioSelected]} />
              </Pressable>
            ))}
          </View>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <AppButton
          label={
            selected
              ? t('membersScreen.assignCashierConfirm', { name: selected.fullName ?? '' })
              : t('membersScreen.assignCashierPickHint')
          }
          onPress={handleConfirm}
          disabled={!selected || saving}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.creamLight },
  content: { flex: 1, paddingHorizontal: spacing.md },
  backRow: { alignSelf: 'flex-start', marginTop: spacing.sm, marginBottom: spacing.md },
  backText: { fontFamily: fonts.inter.medium, fontSize: 13, color: colors.navy },
  title: { fontFamily: fonts.fraunces.semiBold, fontSize: 22, color: colors.navyDark, marginBottom: 2 },
  subtitle: { fontFamily: fonts.inter.regular, fontSize: 12, color: colors.inkSoft, marginBottom: spacing.lg, lineHeight: 17 },
  spinner: { marginVertical: spacing.xl },
  list: { gap: spacing.xs + 2 },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderWidth: 1.5, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.sm,
  },
  memberRowSelected: { borderColor: colors.goldDark, backgroundColor: colors.cream },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.inter.semiBold, fontSize: 14, color: colors.white },
  memberName: { flex: 1, fontFamily: fonts.inter.medium, fontSize: 13.5, color: colors.navyDark },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.sand },
  radioSelected: { borderColor: colors.goldDark, backgroundColor: colors.goldDark },
  errorText: { fontFamily: fonts.inter.medium, fontSize: 11.5, color: colors.danger, marginTop: spacing.sm },
  footer: { paddingHorizontal: spacing.md + 2 },
});
