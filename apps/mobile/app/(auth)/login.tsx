import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton } from '../../src/components/AppButton';
import { CountryDropdown } from '../../src/components/CountryDropdown';
import { RotationMotif } from '../../src/components/RotationMotif';
import { FadeIn } from '../../src/components/motion';
import { authApi } from '../../src/services/endpoints/auth';
import { useCountryStore } from '../../src/store/country.store';
import { colors, fonts, radii, spacing } from '../../src/theme';

// Écran 4 — Connexion / entrée du parcours d'authentification.
// C'est un écran unique de saisie du numéro de téléphone : il sert aussi
// bien à un nouveau membre (« Créer un compte », écran 80) qu'à un membre
// existant, puisque les deux parcours se rejoignent sur la vérification
// par OTP (écran 5). L'indicatif pays est géré par useCountryStore,
// partagé avec l'écran 80 ; sa sélection se fait désormais par la liste
// déroulante inline CountryDropdown (plus d'écran dédié).
export default function LoginScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const selectedCountry = useCountryStore((s) => s.selectedCountry);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    const digits = phoneNumber.trim();
    if (!digits) {
      setError(t('auth.phoneRequiredError'));
      return;
    }

    const fullPhoneNumber = `${selectedCountry.dialCode}${digits.replace(/\s+/g, '')}`;
    setError(null);
    setIsSubmitting(true);
    try {
      await authApi.requestOtp(fullPhoneNumber);
      router.push({ pathname: '/(auth)/otp', params: { phoneNumber: fullPhoneNumber } });
    } catch {
      setError(t('auth.otpSendError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <RotationMotif size={72} activeIndex={0} />

        <FadeIn delay={120}>
          <Text style={styles.brand}>{t('auth.brandName')}</Text>
          <Text style={styles.tagline}>{t('auth.brandTagline')}</Text>
        </FadeIn>

        <View style={styles.form}>
          <FadeIn delay={220}>
            <Text style={styles.label}>{t('auth.phoneNumberLabel')}</Text>
            <View style={styles.phoneRow}>
              <CountryDropdown width={84} />
              <TextInput
                style={styles.phoneInput}
                value={phoneNumber}
                onChangeText={(v) => {
                  setPhoneNumber(v);
                  if (error) setError(null);
                }}
                placeholder={t('auth.phoneNumberPlaceholder')}
                placeholderTextColor={colors.navySoft}
                keyboardType="phone-pad"
                autoComplete="tel"
                returnKeyType="done"
                onSubmitEditing={handleContinue}
              />
            </View>

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : (
              <Text style={styles.hint}>{t('auth.diasporaHint')}</Text>
            )}
          </FadeIn>

          <FadeIn delay={300}>
            <AppButton
              label={isSubmitting ? t('auth.sendingOtp') : t('common.continue')}
              onPress={handleContinue}
              disabled={isSubmitting}
              style={styles.continueButton}
            />
            {isSubmitting && (
              <ActivityIndicator color={colors.gold} style={styles.spinner} />
            )}

            <Pressable onPress={() => router.push('/(auth)/create-account')} hitSlop={8}>
              <Text style={styles.footerText}>
                {t('auth.noAccountYet')}{' '}
                <Text style={styles.footerLink}>{t('auth.createAccount.linkLabel')}</Text>
              </Text>
            </Pressable>
          </FadeIn>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy,
  },
  scroll: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg + 2,
    flexGrow: 1,
    justifyContent: 'center',
  },
  brand: {
    fontFamily: fonts.fraunces.semiBold,
    fontSize: 30,
    color: colors.white,
    marginTop: spacing.md + 2,
    marginBottom: spacing.xs + 2,
  },
  tagline: {
    fontFamily: fonts.inter.regular,
    fontSize: 12.5,
    color: colors.lavender,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.xl + 2,
  },
  form: {
    width: '100%',
  },
  label: {
    fontFamily: fonts.inter.medium,
    fontSize: 11.5,
    color: colors.lavender,
    marginBottom: spacing.xs + 2,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  phoneInput: {
    flex: 1,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.navyMedium,
    backgroundColor: colors.navyDark,
    color: colors.white,
    fontFamily: fonts.mono.medium,
    fontSize: 14,
    paddingHorizontal: spacing.sm + 2,
  },
  hint: {
    fontFamily: fonts.inter.regular,
    fontSize: 10.5,
    color: colors.navySoft,
    lineHeight: 15,
    marginTop: spacing.sm,
    marginBottom: spacing.md - 2,
  },
  errorText: {
    fontFamily: fonts.inter.medium,
    fontSize: 10.5,
    color: colors.danger,
    lineHeight: 15,
    marginTop: spacing.sm,
    marginBottom: spacing.md - 2,
  },
  continueButton: {
    marginBottom: spacing.sm + 2,
  },
  spinner: {
    marginBottom: spacing.sm,
  },
  footerText: {
    textAlign: 'center',
    fontFamily: fonts.inter.regular,
    fontSize: 11.5,
    color: colors.navySoft,
    marginTop: spacing.xs + 2,
  },
  footerLink: {
    fontFamily: fonts.inter.bold,
    color: colors.gold,
  },
});
