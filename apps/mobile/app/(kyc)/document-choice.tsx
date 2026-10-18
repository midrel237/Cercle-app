import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as WebBrowser from 'expo-web-browser';
import { AppButton } from '../../src/components/AppButton';
import { KycProgressHeader } from '../../src/components/KycProgressHeader';
import { KycDocumentType, useKycStore } from '../../src/store/kyc.store';
import { kycApi } from '../../src/services/endpoints/kyc';
import { colors, fonts, radii, spacing } from '../../src/theme';

const OPTIONS: { type: KycDocumentType; icon: string; labelKey: string; hintKey: string }[] = [
  { type: 'carte_identite', icon: '🪪', labelKey: 'kyc.documentChoice.cni', hintKey: 'kyc.documentChoice.cniHint' },
  { type: 'passeport', icon: '📘', labelKey: 'kyc.documentChoice.passport', hintKey: 'kyc.documentChoice.passportHint' },
  { type: 'permis_conduire', icon: '🚗', labelKey: 'kyc.documentChoice.license', hintKey: 'kyc.documentChoice.licenseHint' },
];

// Écran 7 — Choix du type de document d'identité.
// Le choix local sert d'indication de préférence ; la collecte des pièces
// est déléguée au flux hébergé Didit : « Continuer » appelle
// POST /kyc/me/session puis ouvre sessionUrl dans le navigateur système
// (WebBrowser auth session). Le retour s'effectue via le deep link
// cercle://kyc/return géré sur processing.tsx.
export default function KycDocumentChoiceScreen() {
  const { t } = useTranslation();
  const documentType = useKycStore((s) => s.documentType);
  const setDocumentType = useKycStore((s) => s.setDocumentType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    setError(null);
    setLoading(true);
    try {
      const { data } = await kycApi.createSession();
      // Auth session : aucun cookie partagé avec le navigateur de l'OS,
      // et le retour deep link ferme la fenêtre automatiquement.
      await WebBrowser.openAuthSessionAsync(data.sessionUrl, 'cercle://kyc/return');
      router.replace('/(kyc)/processing');
    } catch (err) {
      setError(t('kyc.documentChoice.sessionError'));
    } finally {
      setLoading(false);
    }
  };

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

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.goldDark} />
        ) : (
          <AppButton label={t('common.continue')} onPress={handleContinue} />
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
  errorText: {
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
