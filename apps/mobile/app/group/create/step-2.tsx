import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../../src/components/AppButton';
import { colors, fonts, radii, spacing } from '../../../src/theme';

// Périodicités prédéfinies, converties en periodicityDays attendu par
// CreateGroupDto (entier >= 1, en jours).
type PeriodicityOption = {
  days: number;
  icon: string;
  labelKey: string;
  hintKey: string;
};

const PERIODICITY_OPTIONS: PeriodicityOption[] = [
  { days: 7, icon: '📅', labelKey: 'createGroup.step2.weekly', hintKey: 'createGroup.step2.weeklyHint' },
  { days: 14, icon: '🗓️', labelKey: 'createGroup.step2.biweekly', hintKey: 'createGroup.step2.biweeklyHint' },
  { days: 30, icon: '📆', labelKey: 'createGroup.step2.monthly', hintKey: 'createGroup.step2.monthlyHint' },
];

/** Pastille radio — hors StyleSheet.create (fonctions interdites par les
 * types de style RN 0.86). */
const radioButton = (selected: boolean): ViewStyle => ({
  width: 20,
  height: 20,
  borderRadius: 10,
  borderWidth: 2,
  borderColor: selected ? colors.goldDark : colors.sand,
  backgroundColor: selected ? colors.goldDark : colors.creamLight,
});

/**
 * Écran 24 — Create Group (step 2) : montant + périodicité.
 * Reçoit name + mode de l'étape 1 en paramètres de navigation. Aucun appel
 * réseau : POST /groups partira de la step-3 avec toutes les données.
 */
export default function CreateGroupStep2Screen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { name, mode } = useLocalSearchParams<{
    name?: string;
    mode?: string;
  }>();

  const [amountRaw, setAmountRaw] = useState('');
  const [periodicityDays, setPeriodicityDays] = useState<number>(7);
  const [amountError, setAmountError] = useState(false);

  const amount = Number(amountRaw.replace(/[^0-9]/g, ''));

  const handleContinue = () => {
    if (!name || !mode) {
      router.replace('/group/create/step-1');
      return;
    }
    if (!amount || !Number.isInteger(amount) || amount <= 0) {
      setAmountError(true);
      return;
    }
    router.push({
      pathname: '/group/create/step-3',
      params: { name, mode, contributionAmount: String(amount), periodicityDays: String(periodicityDays) },
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={router.back} hitSlop={12} style={styles.backRow}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </Pressable>

        <Text style={styles.stepLabel}>{t('createGroup.step2.stepLabel')}</Text>
        <Text style={styles.title}>{t('createGroup.step2.title')}</Text>
        <Text style={styles.subtitle}>{t('createGroup.step2.subtitle')}</Text>

        <Text style={styles.label}>{t('createGroup.step2.amountLabel')}</Text>
        <View style={styles.amountRow}>
          <TextInput
            style={[styles.amountInput, amountError && styles.inputError]}
            value={amountRaw}
            onChangeText={(v) => {
              setAmountRaw(v);
              if (amountError) setAmountError(false);
            }}
            placeholder={t('createGroup.step2.amountPlaceholder')}
            placeholderTextColor={colors.navySoft}
            keyboardType="number-pad"
            returnKeyType="done"
          />
          <Text style={styles.amountSuffix}>{t('createGroup.step2.amountSuffix')}</Text>
        </View>
        {amountError ? <Text style={styles.errorText}>{t('createGroup.step2.amountError')}</Text> : null}

        <Text style={styles.label}>{t('createGroup.step2.periodicityLabel')}</Text>
        <View style={styles.optionList}>
          {PERIODICITY_OPTIONS.map((opt) => {
            const selected = periodicityDays === opt.days;
            return (
              <Pressable
                key={opt.days}
                style={({ pressed }) => [
                  styles.optionRow,
                  selected && styles.optionRowSelected,
                  pressed && styles.optionRowPressed,
                ]}
                onPress={() => setPeriodicityDays(opt.days)}
              >
                <Text style={styles.optionIcon}>{opt.icon}</Text>
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionTitle}>{t(opt.labelKey)}</Text>
                  <Text style={styles.optionHint}>{t(opt.hintKey)}</Text>
                </View>
                <View style={radioButton(selected)} />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <AppButton label={t('common.continue')} onPress={handleContinue} />
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
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  amountInput: {
    flex: 1,
    fontFamily: fonts.mono.semiBold,
    fontSize: 18,
    color: colors.navyDark,
    borderWidth: 1.5,
    borderColor: colors.sand,
    borderRadius: radii.md,
    backgroundColor: colors.creamLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  inputError: {
    borderColor: colors.danger,
  },
  amountSuffix: {
    fontFamily: fonts.inter.regular,
    fontSize: 12,
    color: colors.inkSoft,
  },
  errorText: {
    fontFamily: fonts.inter.medium,
    fontSize: 11.5,
    color: colors.danger,
    marginBottom: spacing.md,
  },
  optionList: {
    gap: spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.sand,
    borderRadius: radii.md,
    backgroundColor: colors.creamLight,
    padding: spacing.md,
    gap: spacing.md,
  },
  optionRowSelected: {
    borderColor: colors.goldDark,
    backgroundColor: colors.cream,
  },
  optionRowPressed: {
    opacity: 0.85,
  },
  optionIcon: {
    fontSize: 22,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: fonts.inter.semiBold,
    fontSize: 14.5,
    color: colors.navyDark,
    marginBottom: 2,
  },
  optionHint: {
    fontFamily: fonts.inter.regular,
    fontSize: 12,
    color: colors.inkSoft,
    lineHeight: 17,
  },
  footer: {
    paddingHorizontal: spacing.md + 2,
  },
});
