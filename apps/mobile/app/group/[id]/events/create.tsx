import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../../../src/components/AppButton';
import { eventsApi, GroupEventType } from '../../../../src/services/endpoints/events';
import { groupsApi } from '../../../../src/services/endpoints/groups';
import { colors, fonts, radii, spacing } from '../../../../src/theme';

const TYPES: { key: GroupEventType; label: string }[] = [
  { key: 'DEUIL', label: 'Deuil' },
  { key: 'ANNIVERSAIRE', label: 'Anniversaire' },
  { key: 'NAISSANCE', label: 'Naissance' },
  { key: 'MARIAGE', label: 'Mariage' },
  { key: 'MALADIE', label: 'Maladie' },
  { key: 'AUTRE', label: 'Autre' },
];

interface MemberRow {
  id: string;
  userId: string;
  fullName: string | null;
}

/**
 * Écran 55 — Créer un évènement : type, bénéficiaire (membre du groupe),
 * montant suggéré par membre, message. Tout membre peut créer une
 * cagnotte (garde serveur : membre actif).
 */
export default function CreateEventScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [type, setType] = useState<GroupEventType>('NAISSANCE');
  const [customLabel, setCustomLabel] = useState('');
  const [beneficiary, setBeneficiary] = useState<MemberRow | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [suggested, setSuggested] = useState('3000');
  const [description, setDescription] = useState('');
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
        if (!cancelled) setError(t('eventsScreen.loadMembersError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  const amount = useMemo(() => {
    const n = Number(suggested.replace(/[^0-9]/g, ''));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, [suggested]);

  const handlePublish = async () => {
    if (!id || !beneficiary || saving) return;
    setSaving(true);
    setError(null);
    try {
      const { data: event } = await eventsApi.create({
        groupId: id,
        type,
        ...(type === 'AUTRE' && customLabel.trim() ? { customLabel: customLabel.trim() } : {}),
        beneficiaryUserId: beneficiary.userId,
        ...(description.trim() ? { description: description.trim() } : {}),
        suggestedAmount: amount,
      });
      router.replace({
        pathname: '/group/[id]/events/[eventId]/contribute',
        params: { id, eventId: event?.id ?? '' },
      });
    } catch {
      setError(t('eventsScreen.createError'));
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={router.back} hitSlop={12} style={styles.backRow}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </Pressable>

        <Text style={styles.title}>{t('eventsScreen.createTitle')}</Text>

        {loading ? (
          <ActivityIndicator size="large" color={colors.goldDark} style={styles.spinner} />
        ) : (
          <>
            <Text style={styles.label}>{t('eventsScreen.typeLabel')}</Text>
            <View style={styles.typeGrid}>
              {TYPES.map((ty) => (
                <Pressable
                  key={ty.key}
                  style={[styles.typeOption, type === ty.key && styles.typeOptionActive]}
                  onPress={() => setType(ty.key)}
                >
                  <Text style={[styles.typeOptionText, type === ty.key && styles.typeOptionTextActive]}>
                    {ty.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {type === 'AUTRE' ? (
              <>
                <Text style={styles.label}>{t('eventsScreen.customLabelLabel')}</Text>
                <TextInput
                  style={styles.input}
                  value={customLabel}
                  onChangeText={setCustomLabel}
                  placeholder={t('eventsScreen.customLabelPlaceholder')}
                  placeholderTextColor={colors.inkSoft}
                  autoCorrect={false}
                />
              </>
            ) : null}

            <Text style={styles.label}>{t('eventsScreen.beneficiaryLabel')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.memberRow}>
              {members.map((m) => (
                <Pressable
                  key={m.id}
                  style={[styles.memberOption, beneficiary?.userId === m.userId && styles.memberOptionActive]}
                  onPress={() => setBeneficiary(m)}
                >
                  <Text
                    style={[styles.memberOptionText, beneficiary?.userId === m.userId && styles.memberOptionTextActive]}
                    numberOfLines={1}
                  >
                    {m.fullName ?? t('eventsScreen.unnamedBeneficiary')}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.label}>{t('eventsScreen.suggestedLabel')}</Text>
            <TextInput
              style={styles.input}
              value={suggested}
              onChangeText={(raw) => setSuggested(raw.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="3000"
              placeholderTextColor={colors.inkSoft}
            />
            <Text style={styles.hint}>{t('eventsScreen.suggestedHint')}</Text>

            <Text style={styles.label}>{t('eventsScreen.messageLabel')}</Text>
            <TextInput
              style={styles.messageInput}
              value={description}
              onChangeText={setDescription}
              placeholder={t('eventsScreen.messagePlaceholder')}
              placeholderTextColor={colors.inkSoft}
              multiline
              maxLength={300}
              textAlignVertical="top"
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <AppButton
          label={saving ? t('eventsScreen.publishing') : t('eventsScreen.publishButton')}
          onPress={handlePublish}
          disabled={saving || loading || !beneficiary}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.creamLight },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  backRow: { alignSelf: 'flex-start', marginTop: spacing.sm, marginBottom: spacing.md },
  backText: { fontFamily: fonts.inter.medium, fontSize: 13, color: colors.navy },
  title: { fontFamily: fonts.fraunces.semiBold, fontSize: 24, color: colors.navyDark, marginBottom: spacing.lg },
  spinner: { marginVertical: spacing.xl },
  label: { fontFamily: fonts.inter.medium, fontSize: 12.5, color: colors.navy, marginBottom: spacing.xs + 2, marginTop: spacing.sm },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeOption: {
    borderWidth: 1.5, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  typeOptionActive: { borderColor: colors.goldDark, backgroundColor: colors.cream },
  typeOptionText: { fontFamily: fonts.inter.medium, fontSize: 12.5, color: colors.inkSoft },
  typeOptionTextActive: { color: colors.navyDark, fontFamily: fonts.inter.semiBold },
  input: {
    fontFamily: fonts.inter.regular, fontSize: 14, color: colors.navyDark,
    borderWidth: 1.5, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  memberRow: { gap: spacing.sm, paddingVertical: 2 },
  memberOption: {
    borderWidth: 1.5, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  memberOptionActive: { borderColor: colors.goldDark, backgroundColor: colors.cream },
  memberOptionText: { fontFamily: fonts.inter.medium, fontSize: 12.5, color: colors.inkSoft },
  memberOptionTextActive: { color: colors.navyDark, fontFamily: fonts.inter.semiBold },
  hint: { fontFamily: fonts.inter.regular, fontSize: 11, color: colors.inkSoft, marginTop: spacing.xs },
  messageInput: {
    fontFamily: fonts.inter.regular, fontSize: 13.5, color: colors.navyDark, lineHeight: 20,
    borderWidth: 1.5, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    minHeight: 90,
  },
  errorText: { fontFamily: fonts.inter.medium, fontSize: 11.5, color: colors.danger, marginTop: spacing.sm },
  footer: { paddingHorizontal: spacing.md + 2 },
});
