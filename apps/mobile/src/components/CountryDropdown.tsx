import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Country,
  DEFAULT_COUNTRY,
  DIASPORA_COUNTRIES,
  REGIONAL_COUNTRIES,
} from '../constants/countries';
import { useCountryStore } from '../store/country.store';
import { colors, fonts, radii, spacing } from '../theme';

interface Props {
  /** Largeur du bouton déclencheur (défaut : celle de l'ancien dialCodeBox). */
  width?: number;
  style?: ViewStyle;
}

/**
 * Liste déroulante de sélection du pays / indicatif téléphonique.
 * Remplace l'écran dédié (auth)/country-picker : plus de navigation, le
 * choix se fait directement sur les écrans de connexion et de création de
 * compte. Le bouton déclencheur occupe la place de l'ancien dialCodeBox ;
 * l'appui ouvre une feuille déroulante (modal) avec les sections Suggéré /
 * Diaspora / Afrique centrale & de l'Ouest.
 *
 * La sélection reste écrite dans useCountryStore — les écrans appelants
 * continuent de lire selectedCountry.dialCode pour composer le numéro.
 * Le point de sélection est un disque doré (pas de glyphe ✓, cassé sur
 * certains appareils).
 */
export function CountryDropdown({ width = 84, style }: Props) {
  const { t } = useTranslation();
  const selectedCountry = useCountryStore((s) => s.selectedCountry);
  const setSelectedCountry = useCountryStore((s) => s.setSelectedCountry);
  const [open, setOpen] = useState(false);

  const sections = useMemo(
    () => [
      { title: t('auth.countryPicker.suggestedSection'), data: [DEFAULT_COUNTRY] },
      { title: t('auth.countryPicker.diasporaSection'), data: DIASPORA_COUNTRIES },
      { title: t('auth.countryPicker.regionalSection'), data: REGIONAL_COUNTRIES },
    ],
    [t],
  );

  const handleSelect = (country: Country) => {
    setSelectedCountry(country);
    setOpen(false);
  };

  return (
    <View style={style}>
      <Pressable style={[styles.trigger, { width }]} onPress={() => setOpen(true)}>
        <Text style={styles.triggerText}>
          {selectedCountry.flag} {selectedCountry.dialCode} ▾
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdropWrap}>
          {/* Zone tactile derrière la feuille : un appui ferme la liste. */}
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t('auth.countryPicker.title')}</Text>
            <Text style={styles.sheetSubtitle}>{t('auth.countryPicker.subtitle')}</Text>

            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {sections.map((section) => (
                <View key={section.title}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  {section.data.map((country) => {
                    const isSelected = country.code === selectedCountry.code;
                    return (
                      <Pressable
                        key={country.code}
                        style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
                        onPress={() => handleSelect(country)}
                      >
                        <Text style={styles.itemFlag}>{country.flag}</Text>
                        <Text style={styles.itemName}>{country.name}</Text>
                        <Text style={styles.itemDial}>{country.dialCode}</Text>
                        <View style={[styles.selectDot, isSelected && styles.selectDotOn]} />
                      </Pressable>
                    );
                  })}
                </View>
              ))}
              <View style={styles.listBottomPadding} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    height: 46,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.navyMedium,
    backgroundColor: colors.navyDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerText: {
    fontFamily: fonts.inter.medium,
    fontSize: 12.5,
    color: colors.white,
  },
  backdropWrap: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,.55)',
  },
  sheet: {
    maxHeight: '72%',
    backgroundColor: colors.navy,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,.25)',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontFamily: fonts.fraunces.semiBold,
    fontSize: 17,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  sheetSubtitle: {
    fontFamily: fonts.inter.regular,
    fontSize: 11,
    color: colors.lavender,
    marginBottom: spacing.md,
  },
  list: {
    flexGrow: 0,
  },
  sectionTitle: {
    fontFamily: fonts.mono.medium,
    fontSize: 10.5,
    color: colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.navyMedium,
    backgroundColor: colors.navyDark,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs + 2,
  },
  itemPressed: {
    borderColor: colors.gold,
  },
  itemFlag: {
    fontSize: 18,
  },
  itemName: {
    flex: 1,
    fontFamily: fonts.inter.medium,
    fontSize: 12.5,
    color: colors.white,
  },
  itemDial: {
    fontFamily: fonts.mono.medium,
    fontSize: 11,
    color: colors.lavender,
  },
  selectDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.navyMedium,
  },
  selectDotOn: {
    borderColor: colors.gold,
    backgroundColor: colors.gold,
  },
  listBottomPadding: {
    height: spacing.xl,
  },
});
