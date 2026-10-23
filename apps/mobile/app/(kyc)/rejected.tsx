import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton } from '../../src/components/AppButton';
import { FadeIn } from '../../src/components/motion';
import { colors, fonts, radii, spacing } from '../../src/theme';

// Écran 15 — Vérification refusée (décision Didit DECLINED).
// Conforme à la maquette : titre « Vérification impossible », motif
// (photo trop floue) et carte « Conseils » (fond uni, reflets, 4 coins).
// L'utilisateur peut relancer une nouvelle session depuis le choix du
// document (le backend crée un nouveau KycDocument à chaque session).
//
// Correctif : l'emoji ⚠️ (badge) se rendait en rectangle cassé — remplacé
// par un badge dessiné ; ScrollView pour les petits écrans.
export default function KycRejectedScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FadeIn delay={80}>
          <View style={styles.badge}>
            <Text style={styles.badgeMark}>!</Text>
          </View>
          <Text style={styles.title}>{t('kyc.rejected.title')}</Text>
          <Text style={styles.subtitle}>{t('kyc.rejected.subtitle')}</Text>
        </FadeIn>

        <FadeIn delay={180}>
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>{t('kyc.rejected.tipsTitle')}</Text>
            <Text style={styles.tipsBody}>{t('kyc.rejected.tipsBody')}</Text>
          </View>
        </FadeIn>
      </ScrollView>

      <View style={styles.footer}>
        <AppButton
          label={t('kyc.rejected.retryButton')}
          onPress={() => router.replace('/(kyc)/document-choice')}
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
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.md + 4,
    paddingTop: spacing.xl + 8,
    paddingBottom: spacing.xl,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.cream,
    borderWidth: 1.5,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  badgeMark: {
    color: colors.danger,
    fontSize: 32,
    fontFamily: fonts.inter.bold,
  },
  title: {
    fontFamily: fonts.fraunces.semiBold,
    fontSize: 20,
    color: colors.navyDark,
    marginBottom: spacing.xs + 2,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.inter.regular,
    fontSize: 12,
    color: colors.inkSoft,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  tipsCard: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.sand,
    borderRadius: radii.md,
    backgroundColor: colors.cream,
    padding: spacing.md,
  },
  tipsTitle: {
    fontFamily: fonts.inter.semiBold,
    fontSize: 13,
    color: colors.navyDark,
    marginBottom: spacing.xs,
  },
  tipsBody: {
    fontFamily: fonts.inter.regular,
    fontSize: 12,
    color: colors.inkSoft,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: spacing.md + 2,
    paddingBottom: 20,
    paddingTop: spacing.sm,
    backgroundColor: colors.creamLight,
  },
});
