import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../../src/components/AppButton';
import { groupsApi } from '../../../src/services/endpoints/groups';
import { colors, fonts, radii, spacing } from '../../../src/theme';

interface CreatedGroup {
  id: string;
}

/**
 * Écran 26 — Group Rules (admin) : options avancées du groupe.
 * Étape finale du tunnel de création : reçoit toutes les données des
 * étapes 1-3 et envoie le POST /groups définitif, champs optionnels
 * inclus (interestRate, penaltyRules, openToDiaspora).
 */
export default function GroupRulesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    name?: string;
    mode?: string;
    contributionAmount?: string;
    periodicityDays?: string;
    rotation?: string;
  }>();

  const [interestRaw, setInterestRaw] = useState('');
  const [penalty, setPenalty] = useState('');
  const [openToDiaspora, setOpenToDiaspora] = useState(false);
  const [interestError, setInterestError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  const hasAllParams = !!(
    params.name &&
    params.mode &&
    params.contributionAmount &&
    params.periodicityDays &&
    params.rotation
  );

  if (!hasAllParams) {
    // Ouvre sans les données des étapes précédentes → retour à l'étape 1.
    router.replace('/group/create/step-1');
    return null;
  }

  const handleCreate = async () => {
    // Validation du taux d'intérêt : nombre entre 0 et 100, optionnel.
    const interest = interestRaw.trim() === '' ? undefined : Number(interestRaw.replace(',', '.'));
    if (interest !== undefined && (!Number.isFinite(interest) || interest < 0 || interest > 100)) {
      setInterestError(true);
      return;
    }
    if (submitting) return;
    setError(false);
    setSubmitting(true);
    try {
      const { data } = await groupsApi.create({
        name: params.name,
        mode: params.mode,
        contributionAmount: Number(params.contributionAmount),
        periodicityDays: Number(params.periodicityDays),
        rotationOrderType: params.rotation,
        interestRate: interest,
        penaltyRules: penalty.trim() === '' ? undefined : penalty.trim(),
        openToDiaspora,
      });
      router.replace(`/group/${(data as CreatedGroup).id}`);
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={router.back} hitSlop={12} style={styles.backRow}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </Pressable>

        <Text style={styles.stepLabel}>{t('createGroup.rules.stepLabel')}</Text>
        <Text style={styles.title}>{t('createGroup.rules.title')}</Text>
        <Text style={styles.subtitle}>{t('createGroup.rules.subtitle')}</Text>

        <Text style={styles.label}>{t('createGroup.rules.interestLabel')}</Text>
        <TextInput
          style={[styles.input, interestError && styles.inputError]}
          value={interestRaw}
          onChangeText={(v) => {
            setInterestRaw(v);
            if (interestError) setInterestError(false);
          }}
          placeholder={t('createGroup.rules.interestPlaceholder')}
          placeholderTextColor={colors.navySoft}
          keyboardType="decimal-pad"
          returnKeyType="done"
        />
        <Text style={styles.hint}>{t('createGroup.rules.interestHint')}</Text>
        {interestError ? <Text style={styles.errorText}>{t('createGroup.rules.interestError')}</Text> : null}

        <Text style={styles.label}>{t('createGroup.rules.penaltyLabel')}</Text>
        <TextInput
          style={[styles.input, styles.penaltyInput]}
          value={penalty}
          onChangeText={setPenalty}
          placeholder={t('createGroup.rules.penaltyPlaceholder')}
          placeholderTextColor={colors.navySoft}
          multiline
        />
        <Text style={styles.hint}>{t('createGroup.rules.penaltyHint')}</Text>

        <View style={styles.diasporaRow}>
          <View style={styles.diasporaTextWrap}>
            <Text style={styles.diasporaLabel}>{t('createGroup.rules.diasporaLabel')}</Text>
            <Text style={styles.hint}>{t('createGroup.rules.diasporaHint')}</Text>
          </View>
          <Switch
            value={openToDiaspora}
            onValueChange={setOpenToDiaspora}
            trackColor={{ false: colors.sand, true: colors.gold }}
            thumbColor={colors.creamLight}
          />
        </View>

        {error ? <Text style={styles.errorText}>{t('createGroup.rules.createError')}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {submitting ? (
          <View style={styles.submittingRow}>
            <ActivityIndicator color={colors.navyDark} />
            <Text style={styles.submittingText}>{t('createGroup.rules.creating')}</Text>
          </View>
        ) : (
          <AppButton label={t('createGroup.rules.createButton')} onPress={handleCreate} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.creamLight,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  backRow: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  backText: {
    fontFamily: fonts.inter.medium,
    fontSize: 13,
    color: colors.navy,
  },
  stepLabel: {
    fontFamily: fonts.inter.medium,
    fontSize: 11,
    color: colors.goldDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: fonts.fraunces.semiBold,
    fontSize: 24,
    color: colors.navyDark,
    marginBottom: spacing.xs + 2,
  },
  subtitle: {
    fontFamily: fonts.inter.regular,
    fontSize: 13,
    color: colors.inkSoft,
    lineHeight: 19,
    marginBottom: spacing.xl,
  },
  label: {
    fontFamily: fonts.inter.medium,
    fontSize: 13,
    color: colors.navyDark,
    marginBottom: spacing.sm,
  },
  hint: {
    fontFamily: fonts.inter.regular,
    fontSize: 11.5,
    color: colors.inkSoft,
    lineHeight: 16,
    marginBottom: spacing.md,
    marginTop: -spacing.xs,
  },
  input: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 15,
    color: colors.navyDark,
    borderWidth: 1.5,
    borderColor: colors.sand,
    borderRadius: radii.md,
    backgroundColor: colors.creamLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.xs,
  },
  penaltyInput: {
    fontFamily: fonts.inter.regular,
    fontSize: 14,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    fontFamily: fonts.inter.medium,
    fontSize: 11.5,
    color: colors.danger,
    marginBottom: spacing.md,
  },
  diasporaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.sand,
    borderRadius: radii.md,
    backgroundColor: colors.creamLight,
    padding: spacing.md,
  },
  diasporaTextWrap: {
    flex: 1,
  },
  diasporaLabel: {
    fontFamily: fonts.inter.semiBold,
    fontSize: 14,
    color: colors.navyDark,
    marginBottom: 2,
  },
  footer: {
    paddingHorizontal: spacing.md + 2,
  },
  submittingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md - 2,
  },
  submittingText: {
    fontFamily: fonts.inter.medium,
    fontSize: 14,
    color: colors.navyDark,
  },
});
