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
import { BackButton } from '../../src/components/BackButton';
import { RotationMotif } from '../../src/components/RotationMotif';
import { FadeIn } from '../../src/components/motion';
import { authApi } from '../../src/services/endpoints/auth';
import { useCountryStore } from '../../src/store/country.store';
import { colors, fonts, radii, spacing } from '../../src/theme';

// Écran 80 — Création de compte, atteint via le lien « Créer un compte »
// de l'écran 4. Fonctionnellement identique à la connexion (le compte est
// réellement créé côté serveur à la vérification OTP, cf. auth.service.ts
// verifyOtp — inscription progressive), mais avec un cadrage et une copie
// dédiés à un nouveau membre, plus l'acceptation explicite des conditions
// d'utilisation.
//
// Correctifs UI : bouton retour partagé BackButton (flèche SVG — le glyphe
// ← se rendait en glyphe cassé ; position absolute sous la zone sûre),
// ScrollView au lieu d'un View centré avec marginTop négatif (le contenu
// débordait sur petits écrans et le bas était rogné), micro-animations
// FadeIn en cascade.
export default function CreateAccountScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const selectedCountry = useCountryStore((s) => s.selectedCountry);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateAccount = async () => {
    const digits = phoneNumber.trim();
    if (!digits) {
      setError(t('auth.phoneRequiredError'));
      return;
    }
    if (!acceptedTerms) {
      setError(t('auth.createAccount.termsRequiredError'));
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
      <BackButton variant="dark" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <RotationMotif size={64} activeIndex={0} />

        <FadeIn delay={120}>
          <Text style={styles.title}>{t('auth.createAccount.title')}</Text>
        </FadeIn>
        <FadeIn delay={180}>
          <Text style={styles.tagline}>{t('auth.createAccount.subtitle')}</Text>
        </FadeIn>

        <View style={styles.form}>
          <FadeIn delay={240}>
            <Text style={styles.label}>{t('auth.phoneNumberLabel')}</Text>
            <View style={styles.phoneRow}>
              <Pressable
                style={styles.dialCodeBox}
                onPress={() => router.push('/(auth)/country-picker')}
              >
                <Text style={styles.dialCodeText}>
                  {selectedCountry.flag} {selectedCountry.dialCode} ▾
                </Text>
              </Pressable>
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
                onSubmitEditing={handleCreateAccount}
              />
            </View>
          </FadeIn>

          <FadeIn delay={310}>
            <Pressable
              style={styles.termsRow}
              onPress={() => {
                setAcceptedTerms((v) => !v);
                if (error) setError(null);
              }}
              hitSlop={6}
            >
              <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                {acceptedTerms && <Text style={styles.checkboxMark}>✓</Text>}
              </View>
              <Text style={styles.termsText}>
                {t('auth.createAccount.termsPrefix')}{' '}
                <Text style={styles.termsLink}>{t('auth.createAccount.termsLink')}</Text>{' '}
                {t('auth.createAccount.termsAnd')}{' '}
                <Text style={styles.termsLink}>{t('auth.createAccount.privacyLink')}</Text>{' '}
                {t('auth.createAccount.termsSuffix')}
              </Text>
            </Pressable>
          </FadeIn>

          {error && (
            <FadeIn>
              <Text style={styles.errorText}>{error}</Text>
            </FadeIn>
          )}

          <FadeIn delay={380}>
            <AppButton
              label={isSubmitting ? t('auth.sendingOtp') : t('auth.createAccount.submitButton')}
              onPress={handleCreateAccount}
              disabled={isSubmitting}
              style={styles.submitButton}
            />
            {isSubmitting && <ActivityIndicator color={colors.gold} style={styles.spinner} />}

            <Pressable onPress={() => router.replace('/(auth)/login')} hitSlop={8}>
              <Text style={styles.footerText}>
                {t('auth.createAccount.alreadyHaveAccount')}{' '}
                <Text style={styles.footerLink}>{t('auth.createAccount.signIn')}</Text>
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
  },
  title: {
    fontFamily: fonts.fraunces.semiBold,
    fontSize: 22,
    color: colors.white,
    marginTop: spacing.sm + 2,
    marginBottom: spacing.xs + 2,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: fonts.inter.regular,
    fontSize: 12,
    color: colors.lavender,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.lg,
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
  dialCodeBox: {
    width: 84,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.navyMedium,
    backgroundColor: colors.navyDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialCodeText: {
    fontFamily: fonts.inter.medium,
    fontSize: 12.5,
    color: colors.white,
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
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs + 2,
    marginTop: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.gold,
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.cream,
  },
  checkboxMark: {
    fontSize: 10,
    color: colors.goldDark,
    fontFamily: fonts.inter.bold,
  },
  termsText: {
    flex: 1,
    fontFamily: fonts.inter.regular,
    fontSize: 10.5,
    color: colors.navySoft,
    lineHeight: 15,
  },
  termsLink: {
    fontFamily: fonts.inter.bold,
    color: colors.gold,
  },
  errorText: {
    fontFamily: fonts.inter.medium,
    fontSize: 10.5,
    color: colors.danger,
    lineHeight: 15,
    marginBottom: spacing.sm,
  },
  submitButton: {
    marginTop: spacing.sm,
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
