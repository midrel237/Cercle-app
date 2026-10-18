import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../src/components/AppButton';
import { groupsApi } from '../../src/services/endpoints/groups';
import { loansApi } from '../../src/services/endpoints/loans';
import { useAuthStore } from '../../src/store/auth.store';
import { colors, fonts, radii, spacing } from '../../src/theme';

const DURATIONS: { value: 1 | 3 | 6; label: string }[] = [
  { value: 1, label: '1 mois' },
  { value: 3, label: '3 mois' },
  { value: 6, label: '6 mois' },
];

interface LoanGroup {
  id: string;
  name: string;
  interestRate: string | null;
  mode: string;
}

/**
 * Écran 58 — Demande de prêt : groupe (prêts internes uniquement), montant,
 * durée (1/3/6), motif, garant optionnel, échéancier prévisionnel calculé
 * et affiché en direct (renvoyé aussi par le serveur à la soumission).
 */
export default function LoanRequestScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ groupId?: string }>();
  const user = useAuthStore((s) => s.user);

  const [groups, setGroups] = useState<LoanGroup[]>([]);
  const [groupId, setGroupId] = useState(params.groupId ?? '');
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState<1 | 3 | 6>(3);
  const [reason, setReason] = useState('');
  const [guarantorId, setGuarantorId] = useState<string | null>(null);
  const [members, setMembers] = useState<{ id: string; userId: string; fullName: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await groupsApi.listMine();
        const eligible = (data ?? []).filter((g: LoanGroup) => g.mode !== 'ROTATIVE');
        setGroups(eligible);
        if (params.groupId) setGroupId(params.groupId);
        else if (eligible.length > 0) setGroupId(eligible[0].id);
      } catch {
        setError(t('loansScreen.loadGroupsError'));
      } finally {
        setLoading(false);
      }
    })();
  }, [params.groupId, t]);

  // Membres du groupe sélectionné (pour le garant).
  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await groupsApi.listMembers(groupId);
        if (!cancelled) {
          setMembers((data?.members ?? []).filter((m: { userId: string }) => m.userId !== user?.id));
        }
      } catch {
        if (!cancelled) setMembers([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [groupId, user?.id]);

  const selectedGroup = groups.find((g) => g.id === groupId);
  const amountNum = Number(amount);

  const schedule = useMemo(() => {
    if (!selectedGroup || !Number.isFinite(amountNum) || amountNum <= 0) return null;
    const rate = Number(selectedGroup.interestRate ?? 0);
    const total = amountNum + Math.round(amountNum * (rate / 100));
    const installment = Math.floor(total / duration);
    const first = new Date();
    first.setMonth(first.getMonth() + 1);
    return Array.from({ length: duration }, (_, i) => ({
      number: i + 1,
      due: new Date(first.getFullYear(), first.getMonth() + i, first.getDate()),
      amount: i === duration - 1 ? total - installment * (duration - 1) : installment,
    }));
  }, [selectedGroup, amountNum, duration]);

  const handleSubmit = async () => {
    if (!groupId || !Number.isFinite(amountNum) || amountNum <= 0 || !reason.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await loansApi.request({
        groupId,
        amount: amountNum,
        durationMonths: duration,
        reason: reason.trim(),
        ...(guarantorId ? { guarantorId } : {}),
      });
      router.replace('/(tabs)/loans');
    } catch {
      setError(t('loansScreen.requestError'));
      setSubmitting(false);
    }
  };

  const valid = groupId && Number.isFinite(amountNum) && amountNum > 0 && reason.trim().length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={router.back} hitSlop={12} style={styles.backRow}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </Pressable>

        <Text style={styles.title}>{t('loansScreen.requestTitle')}</Text>

        {loading ? (
          <ActivityIndicator size="large" color={colors.goldDark} style={styles.spinner} />
        ) : groups.length === 0 ? (
          <Text style={styles.emptyText}>{t('loansScreen.noLoanGroups')}</Text>
        ) : (
          <>
            <Text style={styles.label}>{t('loansScreen.groupLabel')}</Text>
            <View style={styles.chipsRow}>
              {groups.map((g) => (
                <Pressable
                  key={g.id}
                  style={[styles.chip, groupId === g.id && styles.chipActive]}
                  onPress={() => setGroupId(g.id)}
                >
                  <Text style={[styles.chipText, groupId === g.id && styles.chipTextActive]} numberOfLines={1}>
                    {g.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>{t('loansScreen.amountLabel')}</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={(raw) => setAmount(raw.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="75000"
              placeholderTextColor={colors.inkSoft}
            />

            <Text style={styles.label}>{t('loansScreen.durationLabel')}</Text>
            <View style={styles.chipsRow}>
              {DURATIONS.map((d) => (
                <Pressable
                  key={d.value}
                  style={[styles.chip, duration === d.value && styles.chipActive]}
                  onPress={() => setDuration(d.value)}
                >
                  <Text style={[styles.chipText, duration === d.value && styles.chipTextActive]}>
                    {d.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>{t('loansScreen.reasonLabel')}</Text>
            <TextInput
              style={styles.reasonInput}
              value={reason}
              onChangeText={setReason}
              placeholder={t('loansScreen.reasonPlaceholder')}
              placeholderTextColor={colors.inkSoft}
              multiline
              maxLength={300}
              textAlignVertical="top"
            />

            <Text style={styles.label}>{t('loansScreen.guarantorLabel')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              <Pressable
                style={[styles.chip, guarantorId === null && styles.chipActive]}
                onPress={() => setGuarantorId(null)}
              >
                <Text style={[styles.chipText, guarantorId === null && styles.chipTextActive]}>
                  {t('loansScreen.noGuarantor')}
                </Text>
              </Pressable>
              {members.map((m) => (
                <Pressable
                  key={m.id}
                  style={[styles.chip, guarantorId === m.userId && styles.chipActive]}
                  onPress={() => setGuarantorId(m.userId)}
                >
                  <Text style={[styles.chipText, guarantorId === m.userId && styles.chipTextActive]} numberOfLines={1}>
                    {m.fullName ?? t('loansScreen.unnamed')}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Échéancier prévisionnel — maquette 58. */}
            {schedule ? (
              <View style={styles.scheduleCard}>
                <Text style={styles.scheduleTitle}>{t('loansScreen.scheduleTitle')}</Text>
                {schedule.map((s) => (
                  <View key={s.number} style={styles.scheduleRow}>
                    <Text style={styles.scheduleLeft}>
                      {t('loansScreen.installmentLabel', { number: s.number })} —{' '}
                      {s.due.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </Text>
                    <Text style={styles.scheduleRight}>
                      {s.amount.toLocaleString('fr-FR')} FCFA
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <AppButton
          label={submitting ? t('loansScreen.submitting') : t('loansScreen.submitButton')}
          onPress={handleSubmit}
          disabled={!valid || submitting}
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
  emptyText: { fontFamily: fonts.inter.regular, fontSize: 12.5, color: colors.inkSoft, textAlign: 'center', marginTop: spacing.xl },
  label: { fontFamily: fonts.inter.medium, fontSize: 12.5, color: colors.navy, marginBottom: spacing.xs + 2, marginTop: spacing.sm },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1.5, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  chipActive: { borderColor: colors.goldDark, backgroundColor: colors.cream },
  chipText: { fontFamily: fonts.inter.medium, fontSize: 12.5, color: colors.inkSoft },
  chipTextActive: { color: colors.navyDark, fontFamily: fonts.inter.semiBold },
  amountInput: {
    fontFamily: fonts.mono.semiBold, fontSize: 18, color: colors.navyDark,
    borderWidth: 1.5, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  reasonInput: {
    fontFamily: fonts.inter.regular, fontSize: 13.5, color: colors.navyDark, lineHeight: 20,
    borderWidth: 1.5, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    minHeight: 80,
  },
  scheduleCard: {
    borderWidth: 1, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, padding: spacing.md, marginTop: spacing.lg,
  },
  scheduleTitle: { fontFamily: fonts.fraunces.semiBold, fontSize: 14, color: colors.navyDark, marginBottom: spacing.sm },
  scheduleRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs + 2 },
  scheduleLeft: { fontFamily: fonts.inter.regular, fontSize: 12, color: colors.inkSoft },
  scheduleRight: { fontFamily: fonts.mono.medium, fontSize: 12, color: colors.navyDark },
  errorText: { fontFamily: fonts.inter.medium, fontSize: 11.5, color: colors.danger, marginTop: spacing.sm },
  footer: { paddingHorizontal: spacing.md + 2 },
});
