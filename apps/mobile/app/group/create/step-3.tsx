import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../../src/components/AppButton';
import { colors, fonts, radii, spacing } from '../../../src/theme';

// Aligné sur CreateGroupDto.rotationOrderType (énumération backend).
type RotationOrderType = 'DRAW' | 'FIXED';

const ROTATION_OPTIONS: {
  value: RotationOrderType;
  icon: string;
  labelKey: string;
  hintKey: string;
}[] = [
  {
    value: 'DRAW',
    icon: '🎲',
    labelKey: 'createGroup.step3.drawTitle',
    hintKey: 'createGroup.step3.drawHint',
  },
  {
    value: 'FIXED',
    icon: '📋',
    labelKey: 'createGroup.step3.fixedTitle',
    hintKey: 'createGroup.step3.fixedHint',
  },
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
 * Écran 25 — Create Group (step 3) : ordre de rotation + récapitulatif.
 * Aucun appel réseau ici : le POST /groups définitif (avec les options
 * avancées de l'écran 26) part de group/create/rules, étape suivante.
 */
export default function CreateGroupStep3Screen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    name?: string;
    mode?: string;
    contributionAmount?: string;
    periodicityDays?: string;
  }>();

  const [rotation, setRotation] = useState<RotationOrderType>('DRAW');

  // Garde-fou : étape ouverte directement sans les paramètres des étapes
  // précédentes (relance du process, deep link…) → retour à l'étape 1.
  const hasAllParams = !!(
    params.name &&
    params.mode &&
    params.contributionAmount &&
    params.periodicityDays
  );

  const modeLabel = () => {
    switch (params.mode) {
      case 'ROTATIVE':
        return t('createGroup.step3.modeRotative');
      case 'INTERNAL_LOAN':
        return t('createGroup.step3.modeLoan');
      default:
        return t('createGroup.step3.modeMixed');
    }
  };

  const handleContinue = () => {
    if (!hasAllParams) {
      router.replace('/group/create/step-1');
      return;
    }
    router.push({
      pathname: '/group/create/rules',
      params: {
        name: params.name,
        mode: params.mode,
        contributionAmount: params.contributionAmount,
        periodicityDays: params.periodicityDays,
        rotation,
      },
    });
  };

  if (!hasAllParams) {
    // Redirection silencieuse vers l'étape 1 plutôt qu'un écran cassé.
    router.replace('/group/create/step-1');
    return null;
  }

  const summaryRows = [
    { label: t('createGroup.step3.summaryName'), value: params.name },
    { label: t('createGroup.step3.summaryMode'), value: modeLabel() },
    {
      label: t('createGroup.step3.summaryAmount'),
      value: `${Number(params.contributionAmount).toLocaleString('fr-FR')} FCFA`,
    },
    {
      label: t('createGroup.step3.summaryPeriodicity'),
      value: t('createGroup.step3.periodicityDays', { count: Number(params.periodicityDays) }),
    },
    {
      label: t('createGroup.step3.summaryRotation'),
      value: rotation === 'DRAW'
        ? t('createGroup.step3.drawTitle')
        : t('createGroup.step3.fixedTitle'),
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={router.back} hitSlop={12} style={styles.backRow}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </Pressable>

        <Text style={styles.stepLabel}>{t('createGroup.step3.stepLabel')}</Text>
        <Text style={styles.title}>{t('createGroup.step3.title')}</Text>
        <Text style={styles.subtitle}>{t('createGroup.step3.subtitle')}</Text>

        <View style={styles.optionList}>
          {ROTATION_OPTIONS.map((opt) => {
            const selected = rotation === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={({ pressed }) => [
                  styles.optionRow,
                  selected && styles.optionRowSelected,
                  pressed && styles.optionRowPressed,
                ]}
                onPress={() => setRotation(opt.value)}
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

        <Text style={styles.summaryTitle}>{t('createGroup.step3.summaryTitle')}</Text>
        <View style={styles.summaryCard}>
          {summaryRows.map((row) => (
            <View
              key={row.label}
              style={[styles.summaryRow, row !== summaryRows[summaryRows.length - 1] && styles.summaryRowBorder]}
            >
              <Text style={styles.summaryLabel}>{row.label}</Text>
              <Text style={styles.summaryValue}>{row.value}</Text>
            </View>
          ))}
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
  optionList: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
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
  summaryTitle: {
    fontFamily: fonts.fraunces.semiBold,
    fontSize: 18,
    color: colors.navyDark,
    marginBottom: spacing.sm,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: colors.sand,
    borderRadius: radii.md,
    backgroundColor: colors.creamLight,
    paddingHorizontal: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
  },
  summaryRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.sand,
  },
  summaryLabel: {
    fontFamily: fonts.inter.regular,
    fontSize: 12.5,
    color: colors.inkSoft,
  },
  summaryValue: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 12.5,
    color: colors.navyDark,
  },
  footer: {
    paddingHorizontal: spacing.md + 2,
  },
});
