import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as WebBrowser from 'expo-web-browser';
import Svg, { Path } from 'react-native-svg';
import { AppButton } from '../../src/components/AppButton';
import { KycProgressHeader } from '../../src/components/KycProgressHeader';
import { FadeIn } from '../../src/components/motion';
import { KycDocumentType, useKycStore } from '../../src/store/kyc.store';
import { kycApi } from '../../src/services/endpoints/kyc';
import { colors, fonts, radii, spacing } from '../../src/theme';

/** Icônes SVG des types de document — remplacent les emojis dont le
 *  rendu est cassé (rectangle compressé) sur certains appareils. */
function DocumentIcon({ type, size = 22 }: { type: KycDocumentType; size?: number }) {
  const common = {
    stroke: colors.navyDark,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {type === 'carte_identite' && (
        <Path d="M3 5h18v14H3zM6 9h6M6 12h8M6 15h5" {...common} />
      )}
      {type === 'passeport' && (
        <Path d="M5 3h11l3 3v15H5zM8 7h6M8 10h9M8 13h9" {...common} />
      )}
      {type === 'permis_conduire' && (
        <Path d="M4 5h16v14H4zM9.5 9.5a3 3 0 100 5 3 3 0 000-5zM15 9v6M18 9v6" {...common} />
      )}
    </Svg>
  );
}

const OPTIONS: { type: KycDocumentType; labelKey: string; hintKey: string }[] = [
  { type: 'carte_identite', labelKey: 'kyc.documentChoice.cni', hintKey: 'kyc.documentChoice.cniHint' },
  { type: 'passeport', labelKey: 'kyc.documentChoice.passport', hintKey: 'kyc.documentChoice.passportHint' },
  { type: 'permis_conduire', labelKey: 'kyc.documentChoice.license', hintKey: 'kyc.documentChoice.licenseHint' },
];

// Écran 7 — Choix du type de document d'identité.
// Le choix local sert d'indication de préférence ; la collecte des pièces
// est déléguée au flux hébergé Didit : « Continuer » appelle
// POST /kyc/me/session puis ouvre sessionUrl dans le navigateur système
// (WebBrowser auth session). Le retour s'effectue via le deep link
// cercle://kyc/return géré sur processing.tsx.
//
// Correctifs UI : icônes SVG au lieu des emojis (🪪 se rendait en
// rectangle illisible), micro-animations FadeIn en cascade sur les cartes.
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
        <FadeIn delay={60}>
          <Text style={styles.title}>{t('kyc.documentChoice.title')}</Text>
        </FadeIn>
        <FadeIn delay={120}>
          <Text style={styles.subtitle}>{t('kyc.documentChoice.subtitle')}</Text>
        </FadeIn>

        {OPTIONS.map((option, i) => {
          const isSelected = option.type === documentType;
          return (
            <FadeIn key={option.type} delay={180 + i * 80}>
              <Pressable
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => setDocumentType(option.type)}
              >
                <View style={styles.iconBox}>
                  <DocumentIcon type={option.type} />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardLabel}>{t(option.labelKey)}</Text>
                  <Text style={styles.cardHint}>{t(option.hintKey)}</Text>
                </View>
                <View style={[styles.radioDot, isSelected && styles.radioDotOn]} />
              </Pressable>
            </FadeIn>
          );
        })}

        {error && (
          <FadeIn>
            <Text style={styles.errorText}>{error}</Text>
          </FadeIn>
        )}
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
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.creamLight,
    borderWidth: 1,
    borderColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
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
