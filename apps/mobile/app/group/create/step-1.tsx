import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../../src/components/AppButton';
import { colors, fonts, radii, spacing } from '../../../src/theme';

// Modes alignés sur CreateGroupDto (backend) — énumération Prisma.
type GroupMode = 'ROTATIVE' | 'INTERNAL_LOAN' | 'MIXED';

const MODE_OPTIONS: {
  value: GroupMode;
  icon: string;
  labelKey: string;
  hintKey: string;
}[] = [
  {
    value: 'ROTATIVE',
    icon: '🔄',
    labelKey: 'createGroup.step1.rotativeTitle',
    hintKey: 'createGroup.step1.rotativeHint',
  },
  {
    value: 'INTERNAL_LOAN',
    icon: '🏦',
    labelKey: 'createGroup.step1.loanTitle',
    hintKey: 'createGroup.step1.loanHint',
  },
  {
    value: 'MIXED',
    icon: '⚖️',
    labelKey: 'createGroup.step1.mixedTitle',
    hintKey: 'createGroup.step1.mixedHint',
  },
];

/**
 * Écran 23 — Create Group (step 1) : nom + mode du groupe.
 * Aucun appel réseau ici : les trois étapes collectent les données, puis
 * POST /groups est envoyé à la fin (step-3). L'étape 2 (contribution,
 * périodicité, ordre de rotation) reçoit name + mode en paramètres de
 * navigation.
 */
export default function CreateGroupStep1Screen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [mode, setMode] = useState<GroupMode>('ROTATIVE');
  const [nameError, setNameError] = useState(false);

  const handleContinue = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(true);
      return;
    }
    router.push({
      pathname: '/group/create/step-2',
      params: { name: trimmed, mode },
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={router.back} hitSlop={12} style={styles.backRow}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </Pressable>

        <Text style={styles.stepLabel}>{t('createGroup.step1.stepLabel')}</Text>
        <Text style={styles.title}>{t('createGroup.step1.title')}</Text>
        <Text style={styles.subtitle}>{t('createGroup.step1.subtitle')}</Text>

        <Text style={styles.label}>{t('createGroup.step1.nameLabel')}</Text>
        <TextInput
          style={[styles.input, nameError && styles.inputError]}
          value={name}
          onChangeText={(v) => {
            setName(v);
            if (nameError) setNameError(false);
          }}
          placeholder={t('createGroup.step1.namePlaceholder')}
          placeholderTextColor={colors.navySoft}
          returnKeyType="next"
          onSubmitEditing={handleContinue}
        />
        {nameError ? <Text style={styles.errorText}>{t('createGroup.step1.nameRequiredError')}</Text> : null}

        <Text style={styles.label}>{t('createGroup.step1.modeLabel')}</Text>
        <View style={styles.modeList}>
          {MODE_OPTIONS.map((opt) => {
            const selected = mode === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={({ pressed }) => [
                  styles.modeRow,
                  selected && styles.modeRowSelected,
                  pressed && styles.modeRowPressed,
                ]}
                onPress={() => setMode(opt.value)}
              >
                <Text style={styles.modeIcon}>{opt.icon}</Text>
                <View style={styles.modeTextWrap}>
                  <Text style={styles.modeTitle}>{t(opt.labelKey)}</Text>
                  <Text style={styles.modeHint}>{t(opt.hintKey)}</Text>
                </View>
                <View style={styles.radioButton(selected)} />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <AppButton
          label={t('common.continue')}
          onPress={handleContinue}
          disabled={name.trim().length === 0}
        />
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
  input: {
    fontFamily: fonts.inter.regular,
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
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    fontFamily: fonts.inter.medium,
    fontSize: 11.5,
    color: colors.danger,
    marginBottom: spacing.md,
  },
  modeList: {
    gap: spacing.sm,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.sand,
    borderRadius: radii.md,
    backgroundColor: colors.creamLight,
    padding: spacing.md,
    gap: spacing.md,
  },
  modeRowSelected: {
    borderColor: colors.goldDark,
    backgroundColor: colors.cream,
  },
  modeRowPressed: {
    opacity: 0.85,
  },
  modeIcon: {
    fontSize: 22,
  },
  modeTextWrap: {
    flex: 1,
  },
  modeTitle: {
    fontFamily: fonts.inter.semiBold,
    fontSize: 14.5,
    color: colors.navyDark,
    marginBottom: 2,
  },
  modeHint: {
    fontFamily: fonts.inter.regular,
    fontSize: 12,
    color: colors.inkSoft,
    lineHeight: 17,
  },
  radioButton: (selected: boolean) => ({
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: selected ? colors.goldDark : colors.sand,
    backgroundColor: selected ? colors.goldDark : colors.creamLight,
  }),
  footer: {
    paddingHorizontal: spacing.md + 2,
  },
});
