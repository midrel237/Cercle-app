import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton } from '../../src/components/AppButton';
import { KycProgressHeader } from '../../src/components/KycProgressHeader';
import { KycDocumentType, useKycStore } from '../../src/store/kyc.store';
import { colors, fonts, radii, spacing } from '../../src/theme';

const OPTIONS: { type: KycDocumentType; icon: string; labelKey: string; hintKey: string }[] = [
  { type: 'carte_identite', icon: '🪪', labelKey: 'kyc.documentChoice.cni', hintKey: 'kyc.documentChoice.cniHint' },
  { type: 'passeport', icon: '📘', labelKey: 'kyc.documentChoice.passport', hintKey: 'kyc.documentChoice.passportHint' },
  { type: 'permis_conduire', icon: '🚗', labelKey: 'kyc.documentChoice.license', hintKey: 'kyc.documentChoice.licenseHint' },
];

// Écran 7 — Choix du type de document d'identité.
// Le choix est stocké dans useKycStore et conditionnera les écrans de
// capture suivants (8-9, pas encore construits) : passeport ne demande
// qu'une page, CNI/permis demandent recto + verso.
export default function KycDocumentChoiceScreen() {
  const { t } = useTranslation();
  const documentType = useKycStore((s) => s.documentType);
  const setDocumentType = useKycStore((s) => s.setDocumentType);

  return (
    <View style={styles.container}>
      <KycProgressHeader stepLabel={t('kyc.documentChoice.stepLabel')} progress={0.56} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t('kyc.documentChoice.title')}</Text>
        <Text style={styles.subtitle}>{t('kyc.documentChoice.subtitle')}</Text>

        {OPTIONS.map((option) => {
          const isSelected = option.type === documentType;
          return (
            <Pressable
              key={option.type}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => setDocumentType(option.type)}
            >
              <Text style={styles.icon}>{option.icon}</Text>
              <View style={styles.cardText}>
                <Text style={styles.cardLabel}>{t(option.labelKey)}</Text>
                <Text style={styles.cardHint}>{t(option.hintKey)}</Text>
              </View>
              <View style={[styles.radioDot, isSelected && styles.radioDotOn]} />
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <AppButton
          label={t('common.continue')}
          onPress={() => router.push('/(kyc)/capture-recto')}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md + 2,
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontFamily: fonts.fraunces.semiBold,
    fontSize: 19,
    color: colors.navyDark,
    marginTop: spacing.xs + 6,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fonts.inter.regular,
    fontSize: 12,
    color: colors.inkSoft,
    lineHeight: 17,
    marginBottom: spacing.md + 2,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.sand,
    borderRadius: radii.md,
    padding: 13,
    marginBottom: 10,
    backgroundColor: colors.creamLight,
  },
  cardSelected: {
    borderColor: colors.goldDark,
    backgroundColor: colors.cream,
  },
  icon: {
    fontSize: 22,
  },
  cardText: {
    flex: 1,
  },
  cardLabel: {
    fontFamily: fonts.inter.medium,
    fontSize: 13,
    color: colors.navyDark,
  },
  cardHint: {
    fontFamily: fonts.inter.regular,
    fontSize: 10.5,
    color: colors.inkSoft,
    marginTop: 1,
  },
  radioDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.sand,
  },
  radioDotOn: {
    borderColor: colors.goldDark,
  },
  footer: {
    paddingHorizontal: spacing.md + 2,
    paddingBottom: 20,
    paddingTop: spacing.sm,
    backgroundColor: colors.creamLight,
  },
});
