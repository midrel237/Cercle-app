import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton } from '../../src/components/AppButton';
import { KycProgressHeader } from '../../src/components/KycProgressHeader';
import { useKycStore } from '../../src/store/kyc.store';
import { colors, fonts, radii, spacing } from '../../src/theme';

// Écran 6 — Introduction au parcours KYC (vérification d'identité).
// Purement informatif : présente les 3 étapes à venir (choix du document,
// capture recto/verso, selfie) et recueille le consentement au traitement
// des données avant de démarrer. Rien n'est encore envoyé au serveur ici
// — l'appel POST /users/me/kyc n'intervient qu'une fois les photos
// capturées (écrans 8-10, pas encore construits).
export default function KycIntroScreen() {
  const { t } = useTranslation();
  const dataProcessingAccepted = useKycStore((s) => s.dataProcessingAccepted);
  const setDataProcessingAccepted = useKycStore((s) => s.setDataProcessingAccepted);
  const [error, setError] = useState<string | null>(null);

  const handleStart = () => {
    if (!dataProcessingAccepted) {
      setError(t('kyc.intro.consentRequiredError'));
      return;
    }
    router.push('/(kyc)/document-choice');
  };

  return (
    <View style={styles.container}>
      <KycProgressHeader
        stepLabel={t('kyc.intro.stepLabel')}
        progress={0.5}
        onBack={() => router.replace('/(auth)/otp')}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.emoji}>🪪</Text>
        <Text style={styles.title}>{t('kyc.intro.title')}</Text>
        <Text style={styles.description}>{t('kyc.intro.description')}</Text>

        <View style={styles.card}>
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={styles.rowLabel}>1. {t('kyc.intro.step1')}</Text>
            <Text style={styles.rowHint}>{t('kyc.intro.step1Hint')}</Text>
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={styles.rowLabel}>2. {t('kyc.intro.step2')}</Text>
            <Text style={styles.rowHint}>{t('kyc.intro.step2Hint')}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>3. {t('kyc.intro.step3')}</Text>
            <Text style={styles.rowHint}>{t('kyc.intro.step3Hint')}</Text>
          </View>
        </View>

        <Pressable
          style={styles.consentRow}
          onPress={() => {
            setDataProcessingAccepted(!dataProcessingAccepted);
            if (error) setError(null);
          }}
        >
          <View style={styles.consentText}>
            <Text style={styles.consentLabel}>{t('kyc.intro.consentLabel')}</Text>
            <Text style={styles.consentSub}>{t('kyc.intro.consentSub')}</Text>
          </View>
          <View style={[styles.switch, dataProcessingAccepted && styles.switchOn]}>
            <View style={[styles.switchKnob, dataProcessingAccepted && styles.switchKnobOn]} />
          </View>
        </Pressable>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <AppButton label={t('kyc.intro.startButton')} onPress={handleStart} />
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
    alignItems: 'center',
    paddingHorizontal: spacing.md + 4,
    paddingTop: spacing.lg - 4,
    paddingBottom: spacing.xxl,
  },
  emoji: {
    fontSize: 44,
    marginBottom: spacing.sm + 6,
  },
  title: {
    fontFamily: fonts.fraunces.semiBold,
    fontSize: 20,
    color: colors.navyDark,
    marginBottom: spacing.xs + 4,
    textAlign: 'center',
  },
  description: {
    fontFamily: fonts.inter.regular,
    fontSize: 12,
    color: colors.inkSoft,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: spacing.lg - 4,
  },
  card: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.sand,
    borderRadius: radii.md,
    backgroundColor: colors.creamLight,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.sand,
  },
  rowLabel: {
    fontFamily: fonts.inter.medium,
    fontSize: 12.5,
    color: colors.ink,
  },
  rowHint: {
    fontFamily: fonts.inter.regular,
    fontSize: 11,
    color: colors.inkSoft,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: spacing.sm + 2,
    gap: spacing.sm,
  },
  consentText: {
    flex: 1,
  },
  consentLabel: {
    fontFamily: fonts.inter.medium,
    fontSize: 12,
    color: colors.ink,
  },
  consentSub: {
    fontFamily: fonts.inter.regular,
    fontSize: 10.5,
    color: colors.inkSoft,
    marginTop: 1,
  },
  switch: {
    width: 42,
    height: 24,
    borderRadius: radii.pill,
    backgroundColor: colors.sand,
    padding: 2,
    justifyContent: 'center',
  },
  switchOn: {
    backgroundColor: colors.goldDark,
  },
  switchKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.creamLight,
  },
  switchKnobOn: {
    transform: [{ translateX: 18 }],
  },
  errorText: {
    width: '100%',
    fontFamily: fonts.inter.medium,
    fontSize: 10.5,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.md + 2,
    paddingBottom: 20,
    paddingTop: spacing.sm,
    backgroundColor: colors.creamLight,
  },
});
