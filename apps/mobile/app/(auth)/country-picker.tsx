import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Country,
  DEFAULT_COUNTRY,
  DIASPORA_COUNTRIES,
  REGIONAL_COUNTRIES,
} from '../../src/constants/countries';
import { BackButton } from '../../src/components/BackButton';
import { FadeIn } from '../../src/components/motion';
import { useCountryStore } from '../../src/store/country.store';
import { colors, fonts, radii, spacing } from '../../src/theme';

type Section = { title: string; data: Country[] };

// Écran 79 — Choix du pays / indicatif téléphonique.
// Ouvert depuis le champ indicatif de l'écran 4 (connexion) et de l'écran
// 80 (création de compte). Le pays choisi est écrit dans useCountryStore,
// puis on revient simplement en arrière (router.back()) — l'écran appelant
// relit le store, pas besoin de faire transiter la sélection par l'URL.
//
// Correctifs UI : bouton retour partagé BackButton (flèche SVG — le
// glyphe ← se rendait en glyphe cassé sur certains appareils ; position
// absolute sous la zone sûre), micro-animations FadeIn sur l'en-tête.
export default function CountryPickerScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const setSelectedCountry = useCountryStore((s) => s.setSelectedCountry);
  const selectedCountry = useCountryStore((s) => s.selectedCountry);
  const [query, setQuery] = useState('');

  const sections = useMemo<Section[]>(() => {
    const all: Section[] = [
      { title: t('auth.countryPicker.suggestedSection'), data: [DEFAULT_COUNTRY] },
      { title: t('auth.countryPicker.diasporaSection'), data: DIASPORA_COUNTRIES },
      { title: t('auth.countryPicker.regionalSection'), data: REGIONAL_COUNTRIES },
    ];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all
      .map((section) => ({
        ...section,
        data: section.data.filter((c) => c.name.toLowerCase().includes(q) || c.dialCode.includes(q)),
      }))
      .filter((section) => section.data.length > 0);
  }, [query, t]);

  const handleSelect = (country: Country) => {
    setSelectedCountry(country);
    router.back();
  };

  return (
    <View style={styles.container}>
      <BackButton />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 56 }]}
        keyboardShouldPersistTaps="handled"
      >
        <FadeIn>
          <Text style={styles.title}>{t('auth.countryPicker.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.countryPicker.subtitle')}</Text>
        </FadeIn>

        <FadeIn delay={100}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder={t('auth.countryPicker.searchPlaceholder')}
              placeholderTextColor={colors.inkSoft}
            />
          </View>
        </FadeIn>

        {sections.map((section, si) => (
          <View key={section.title}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.data.map((country, ci) => {
              const isSelected = country.code === selectedCountry.code;
              return (
                <FadeIn key={country.code} delay={140 + (si * 3 + ci) * 35}>
                  <Pressable
                    style={[styles.card, isSelected && styles.cardSelected]}
                    onPress={() => handleSelect(country)}
                  >
                    <Text style={styles.flag}>{country.flag}</Text>
                    <View style={styles.cardText}>
                      <Text style={styles.countryName}>{country.name}</Text>
                      <Text style={styles.dialCode}>{country.dialCode}</Text>
                    </View>
                    <View style={[styles.radioDot, isSelected && styles.radioDotOn]} />
                  </Pressable>
                </FadeIn>
              );
            })}
          </View>
        ))}
      </ScrollView>
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
    paddingBottom: spacing.xl,
  },
  title: {
    fontFamily: fonts.fraunces.semiBold,
    fontSize: 19,
    color: colors.navyDark,
  },
  subtitle: {
    fontFamily: fonts.inter.regular,
    fontSize: 11,
    color: colors.inkSoft,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    borderWidth: 1.5,
    borderColor: colors.sand,
    borderRadius: radii.md,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginVertical: spacing.md - 2,
    backgroundColor: colors.creamLight,
  },
  searchIcon: {
    fontSize: 13,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.inter.medium,
    fontSize: 12,
    color: colors.ink,
  },
  sectionTitle: {
    fontFamily: fonts.mono.medium,
    fontSize: 10.5,
    color: colors.goldDark,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: spacing.sm,
    marginBottom: spacing.xs + 2,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.sand,
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
    backgroundColor: colors.creamLight,
  },
  cardSelected: {
    borderColor: colors.goldDark,
    backgroundColor: colors.cream,
  },
  flag: {
    fontSize: 20,
  },
  cardText: {
    flex: 1,
  },
  countryName: {
    fontFamily: fonts.inter.medium,
    fontSize: 13,
    color: colors.navyDark,
  },
  dialCode: {
    fontFamily: fonts.mono.medium,
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
});
