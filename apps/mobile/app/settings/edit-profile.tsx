import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../src/components/AppButton';
import { usersApi } from '../../src/services/endpoints/account';
import { colors, fonts, radii, spacing } from '../../src/theme';

/**
 * Écran 73 — Modifier le profil : nom complet (numéro en lecture seule —
 * il est vérifié par OTP et ne se change pas sans nouvelle vérification),
 * langue. PATCH /users/me.
 */
export default function EditProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await usersApi.getProfile();
        if (!cancelled) {
          setFullName(data?.fullName ?? '');
          setPhone(data?.phoneNumber ?? '');
        }
      } catch {
        if (!cancelled) setError(t('profileScreen.loadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const handleSave = async () => {
    if (!fullName.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await usersApi.updateProfile({ fullName: fullName.trim() });
      router.back();
    } catch {
      setError(t('profileScreen.saveError'));
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Pressable onPress={router.back} hitSlop={12} style={styles.backRow}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </Pressable>

        <Text style={styles.title}>{t('profileScreen.editTitle')}</Text>

        {loading ? (
          <ActivityIndicator size="large" color={colors.goldDark} style={styles.spinner} />
        ) : (
          <>
            <Text style={styles.label}>{t('profileScreen.fullNameLabel')}</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder={t('profileScreen.unnamed')}
              placeholderTextColor={colors.inkSoft}
              autoCorrect={false}
            />

            <Text style={styles.label}>{t('profileScreen.phoneLabel')}</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={phone}
              editable={false}
            />
            <Text style={styles.hint}>{t('profileScreen.phoneHint')}</Text>
          </>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <AppButton
          label={saving ? t('profileScreen.saving') : t('profileScreen.saveButton')}
          onPress={handleSave}
          disabled={saving || loading || !fullName.trim()}
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
  title: { fontFamily: fonts.fraunces.semiBold, fontSize: 24, color: colors.navyDark, marginBottom: spacing.lg },
  spinner: { marginVertical: spacing.xl },
  label: { fontFamily: fonts.inter.medium, fontSize: 12.5, color: colors.navy, marginBottom: spacing.xs + 2, marginTop: spacing.sm },
  input: {
    fontFamily: fonts.inter.regular, fontSize: 14, color: colors.navyDark,
    borderWidth: 1.5, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  inputDisabled: { color: colors.inkSoft },
  hint: { fontFamily: fonts.inter.regular, fontSize: 11, color: colors.inkSoft, marginTop: spacing.xs },
  errorText: { fontFamily: fonts.inter.medium, fontSize: 11.5, color: colors.danger, marginTop: spacing.sm },
  footer: { paddingHorizontal: spacing.md + 2 },
});
