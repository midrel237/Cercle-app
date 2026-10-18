import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../src/components/AppButton';
import { colors, fonts, radii, spacing } from '../../src/theme';

const COUNTRIES = [
  { key: 'CM', label: '🇨🇲 Cameroun', dial: '+237' },
  { key: 'FR', label: '🇫🇷 France', dial: '+33' },
  { key: 'BE', label: '🇧🇪 Belgique', dial: '+32' },
  { key: 'DE', label: '🇩🇪 Allemagne', dial: '+49' },
  { key: 'GB', label: '🇬🇧 Royaume-Uni', dial: '+44' },
  { key: 'US', label: '🇺🇸 États-Unis', dial: '+1' },
  { key: 'CA', label: '🇨🇦 Canada', dial: '+1' },
  { key: 'GA', label: '🇬🇦 Gabon', dial: '+241' },
  { key: 'TD', label: '🇹🇩 Tchad', dial: '+235' },
  { key: 'CI', label: "🇨🇮 Côte d'Ivoire", dial: '+225' },
  { key: 'NG', label: '🇳🇬 Nigeria', dial: '+234' },
];

const CURRENCIES = [
  { key: 'XAF', label: 'FCFA' },
  { key: 'EUR', label: 'EUR €' },
  { key: 'USD', label: 'USD $' },
  { key: 'GBP', label: 'GBP £' },
  { key: 'CAD', label: 'CAD $' },
];

/**
 * Écran 75 — Pays & devise : pays de résidence (utilisé pour les moyens
 * de paiement et les groupes diaspora) et devise d'AFFICHAGE — les
 * montants restent enregistrés en FCFA dans le ledger du groupe ; seul
 * l'affichage est converti au taux du jour (préférence locale en MVP,
 * la conversion à la volée suivra).
 */
export default function RegionScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [country, setCountry] = useState('CM');
  const [currency, setCurrency] = useState('XAF');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Pressable onPress={router.back} hitSlop={12} style={styles.backRow}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </Pressable>

        <Text style={styles.title}>{t('regionScreen.title')}</Text>

        <Text style={styles.label}>{t('regionScreen.countryLabel')}</Text>
        <View style={styles.chipsRow}>
          {COUNTRIES.map((c) => (
            <Pressable
              key={c.key}
              style={[styles.chip, country === c.key && styles.chipActive]}
              onPress={() => setCountry(c.key)}
            >
              <Text style={[styles.chipText, country === c.key && styles.chipTextActive]}>
                {c.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.hint}>{t('regionScreen.countryHint')}</Text>

        <Text style={styles.label}>{t('regionScreen.currencyLabel')}</Text>
        <View style={styles.chipsRow}>
          {CURRENCIES.map((c) => (
            <Pressable
              key={c.key}
              style={[styles.chip, currency === c.key && styles.chipActive]}
              onPress={() => setCurrency(c.key)}
            >
              <Text style={[styles.chipText, currency === c.key && styles.chipTextActive]}>
                {c.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.hint}>{t('regionScreen.currencyHint')}</Text>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <AppButton label={t('profileScreen.saveButton')} onPress={router.back} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.creamLight },
  content: { flex: 1, paddingHorizontal: spacing.md },
  backRow: { alignSelf: 'flex-start', marginTop: spacing.sm, marginBottom: spacing.md },
  backText: { fontFamily: fonts.inter.medium, fontSize: 13, color: colors.navy },
  title: { fontFamily: fonts.fraunces.semiBold, fontSize: 24, color: colors.navyDark, marginBottom: spacing.lg },
  label: { fontFamily: fonts.inter.medium, fontSize: 12.5, color: colors.navy, marginBottom: spacing.xs + 2 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1.5, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  chipActive: { borderColor: colors.goldDark, backgroundColor: colors.cream },
  chipText: { fontFamily: fonts.inter.medium, fontSize: 12.5, color: colors.inkSoft },
  chipTextActive: { color: colors.navyDark, fontFamily: fonts.inter.semiBold },
  hint: { fontFamily: fonts.inter.regular, fontSize: 11, color: colors.inkSoft, lineHeight: 16, marginTop: spacing.xs, marginBottom: spacing.lg },
  footer: { paddingHorizontal: spacing.md + 2 },
});
