import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton } from '../../src/components/AppButton';
import { colors, fonts, radii, spacing } from '../../src/theme';

type LanguageCode = 'fr' | 'en';

const LANGUAGES: { code: LanguageCode; flag: string; labelKey: string; hintKey: string }[] = [
  { code: 'fr', flag: '🇫🇷', labelKey: 'discovery.language.fr', hintKey: 'discovery.language.frHint' },
  { code: 'en', flag: '🇬🇧', labelKey: 'discovery.language.en', hintKey: 'discovery.language.enHint' },
];

// Écran 2 — Choix de la langue (section Découverte)
// Français par défaut (Cameroun), Anglais disponible dès le départ pour la
// diaspora. Le choix est appliqué immédiatement à i18n puis on avance vers
// le carrousel de bienvenue.
export default function LanguageScreen() {
  const { t, i18n } = useTranslation();
  const [selected, setSelected] = useState<LanguageCode>(
    i18n.language === 'en' ? 'en' : 'fr',
  );

  const handleContinue = () => {
    i18n.changeLanguage(selected);
    router.push('/(auth)/welcome');
  };

  return (
    <View style={styles.container}>
      <View style={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('discovery.language.title')}</Text>
          <Text style={styles.subtitle}>{t('discovery.language.subtitle')}</Text>
        </View>

        {LANGUAGES.map((lang) => {
          const isOn = selected === lang.code;
          return (
            <Pressable
              key={lang.code}
              onPress={() => setSelected(lang.code)}
              style={[styles.card, isOn && styles.cardOn]}
            >
              <Text style={styles.flag}>{lang.flag}</Text>
              <View style={styles.textWrap}>
                <Text style={styles.label}>{t(lang.labelKey)}</Text>
                <Text style={styles.hint}>{t(lang.hintKey)}</Text>
              </View>
              <View style={[styles.radiodot, isOn && styles.radiodotOn]}>
                {isOn && <View style={styles.radiodotInner} />}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <AppButton label={t('common.continue')} onPress={handleContinue} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: spacing.md + 2,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg + 4,
  },
  title: {
    fontFamily: fonts.fraunces.semiBold,
    fontSize: 22,
    color: colors.white,
  },
  subtitle: {
    fontFamily: fonts.inter.regular,
    fontSize: 12,
    color: colors.lavender,
    marginTop: spacing.xs + 2,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    borderWidth: 1.5,
    borderColor: colors.navyMedium,
    borderRadius: radii.md,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: spacing.sm + 2,
    backgroundColor: colors.navyMedium,
  },
  cardOn: {
    borderColor: colors.gold,
  },
  flag: {
    fontSize: 21,
  },
  textWrap: {
    flex: 1,
  },
  label: {
    fontFamily: fonts.inter.bold,
    fontSize: 13,
    color: colors.white,
  },
  hint: {
    fontFamily: fonts.inter.regular,
    fontSize: 10.5,
    color: colors.lavender,
    marginTop: 1,
  },
  radiodot: {
    width: 18,
    height: 18,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.navyLight,
  },
  radiodotOn: {
    borderColor: colors.gold,
  },
  radiodotInner: {
    flex: 1,
    margin: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.gold,
  },
  footer: {
    paddingHorizontal: spacing.md + 2,
    paddingBottom: 20,
    paddingTop: spacing.sm + 4,
  },
});
