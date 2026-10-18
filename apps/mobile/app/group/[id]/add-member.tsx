import React, { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../../src/components/AppButton';
import { groupsApi } from '../../../src/services/endpoints/groups';
import { colors, fonts, radii, spacing } from '../../../src/theme';

/**
 * Écran 43 — Ajouter un membre. Le flux d'adhésion réel est celui de la
 * Phase 1 (le destinataire saisit le code → demande PENDING → validation
 * admin) : cet écran expose donc le code d'invitation du groupe, le
 * partage natif (WhatsApp/e-mail) et une prévisualisation du numéro saisi.
 * L'invitation SMS directe sans validation admin ne fait pas partie du
 * flux validé par la maquette (écran 28).
 */
export default function AddMemberScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id, code } = useLocalSearchParams<{ id: string; code?: string }>();

  const [inviteCode, setInviteCode] = useState(code ?? '');
  const [phone, setPhone] = useState('');

  // Recharge le code d'invitation si le paramètre manquait.
  useEffect(() => {
    if (inviteCode || !id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await groupsApi.getOne(id);
        if (!cancelled && data?.inviteCode) setInviteCode(data.inviteCode);
      } catch {
        // Silencieux : le code peut venir du paramètre de navigation.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inviteCode, id]);

  const shareMessage = t('membersScreen.shareMessage', { code: inviteCode });

  const handleShare = () => {
    Share.share({ message: shareMessage });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Pressable onPress={router.back} hitSlop={12} style={styles.backRow}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </Pressable>

        <Text style={styles.title}>{t('membersScreen.addTitle')}</Text>

        <Text style={styles.label}>{t('membersScreen.addPhoneLabel')}</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder={t('membersScreen.addPhonePlaceholder')}
          placeholderTextColor={colors.inkSoft}
          keyboardType="phone-pad"
          autoCorrect={false}
        />
        <Text style={styles.hint}>{t('membersScreen.addPhoneHint')}</Text>

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>{t('membersScreen.codeLabel')}</Text>
          <Text style={styles.codeValue}>{inviteCode || '— — —'}</Text>
          <Pressable onPress={handleShare} hitSlop={8}>
            <Text style={styles.shareLink}>{t('membersScreen.shareInvitation')}</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <AppButton label={t('membersScreen.sendInvitation')} onPress={handleShare} />
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
  label: { fontFamily: fonts.inter.medium, fontSize: 12.5, color: colors.navy, marginBottom: spacing.xs + 2 },
  input: {
    fontFamily: fonts.inter.regular, fontSize: 14, color: colors.navyDark,
    borderWidth: 1.5, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  hint: { fontFamily: fonts.inter.regular, fontSize: 11, color: colors.inkSoft, marginTop: spacing.xs, marginBottom: spacing.lg, lineHeight: 16 },
  codeCard: {
    borderWidth: 1.5, borderColor: colors.goldDark, borderRadius: radii.md,
    backgroundColor: colors.cream, padding: spacing.md, alignItems: 'center',
  },
  codeLabel: { fontFamily: fonts.inter.medium, fontSize: 11, color: colors.inkSoft, marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.8 },
  codeValue: { fontFamily: fonts.mono.semiBold, fontSize: 22, color: colors.navyDark, marginBottom: spacing.sm },
  shareLink: { fontFamily: fonts.inter.semiBold, fontSize: 12.5, color: colors.goldDark },
  footer: { paddingHorizontal: spacing.md + 2 },
});
