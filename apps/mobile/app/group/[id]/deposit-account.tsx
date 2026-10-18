import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../../src/components/AppButton';
import { groupsApi } from '../../../src/services/endpoints/groups';
import { colors, fonts, radii, spacing } from '../../../src/theme';

const PROVIDERS = [
  { key: 'MTN_MOMO', label: 'MTN Mobile Money' },
  { key: 'ORANGE_MONEY', label: 'Orange Money' },
] as const;

/**
 * Écran 49 — Compte de dépôt du groupe (caissier). Opérateur + numéro →
 * POST deposit-account (garde serveur : seul le caissier peut enregistrer
 * SON numéro). Option A §7 : les cotisations y transitent avant
 * reversement — Cercle ne détient jamais les fonds.
 */
export default function DepositAccountScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [provider, setProvider] = useState<'MTN_MOMO' | 'ORANGE_MONEY'>('MTN_MOMO');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pré-remplissage si le groupe a déjà un compte de dépôt enregistré.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await groupsApi.getOne(id);
        if (!cancelled && data?.depositAccountPhoneNumber) {
          setPhone(data.depositAccountPhoneNumber);
          if (data.depositAccountProvider) {
            setProvider(data.depositAccountProvider);
          }
        }
      } catch {
        // Silencieux : pré-remplissage best-effort.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSave = async () => {
    if (!id || saving || phone.replace(/[^0-9]/g, '').length < 8) return;
    setSaving(true);
    setError(null);
    try {
      await groupsApi.registerDepositAccount(id, provider, phone);
      router.replace({ pathname: '/group/[id]', params: { id } });
    } catch {
      setError(t('membersScreen.depositAccountError'));
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Pressable onPress={router.back} hitSlop={12} style={styles.backRow}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </Pressable>

        <Text style={styles.title}>{t('membersScreen.depositAccountTitle')}</Text>
        <Text style={styles.subtitle}>{t('membersScreen.depositAccountSubtitle')}</Text>

        {loading ? (
          <ActivityIndicator size="large" color={colors.goldDark} style={styles.spinner} />
        ) : (
          <>
            <View style={styles.providerRow}>
              {PROVIDERS.map((p) => (
                <Pressable
                  key={p.key}
                  style={[styles.providerOption, provider === p.key && styles.providerOptionActive]}
                  onPress={() => setProvider(p.key)}
                >
                  <Text style={styles.providerOptionText}>{p.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>{t('membersScreen.depositPhoneLabel')}</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+237 6 77 XX XX 42"
              placeholderTextColor={colors.inkSoft}
              keyboardType="phone-pad"
              autoCorrect={false}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </>
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <AppButton
          label={t('membersScreen.depositSaveButton')}
          onPress={handleSave}
          disabled={saving || phone.replace(/[^0-9]/g, '').length < 8}
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
  providerRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  providerOption: {
    borderWidth: 1.5, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  providerOptionActive: { borderColor: colors.goldDark, backgroundColor: colors.cream },
  providerOptionText: { fontFamily: fonts.inter.medium, fontSize: 12.5, color: colors.navyDark },
  label: { fontFamily: fonts.inter.medium, fontSize: 12.5, color: colors.navy, marginBottom: spacing.xs + 2 },
  input: {
    fontFamily: fonts.inter.regular, fontSize: 14, color: colors.navyDark,
    borderWidth: 1.5, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  errorText: { fontFamily: fonts.inter.medium, fontSize: 11.5, color: colors.danger, marginTop: spacing.sm },
  footer: { paddingHorizontal: spacing.md + 2 },
});
