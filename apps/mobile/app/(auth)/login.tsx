import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton } from '../../src/components/AppButton';
import { RotationMotif } from '../../src/components/RotationMotif';
import { FadeIn, PopIn } from '../../src/components/motion';
import { authApi } from '../../src/services/endpoints/auth';
import { setStoredAccessToken, getStoredPhoneNumber } from '../../src/services/api-client';
import { useAuthStore } from '../../src/store/auth.store';
import { colors, fonts, radii, spacing } from '../../src/theme';

const PIN_LENGTH = 4;

// Écran 4 — Connexion.
// Un compte existant (qui a déjà configuré son PIN à l'inscription, écran
// 16-17) se connecte UNIQUEMENT avec son code PIN : le numéro de téléphone
// est rappelé en lecture seule (restauré depuis SecureStore si le store
// mémoire est vide — redémarrage de l'app), la saisie se fait sur 4 cases
// façon maquette (même pattern que l'écran 16). 4 chiffres →
// POST /auth/login (numéro mémorisé + PIN) → tokens → accueil.
// Le lien « Code PIN oublié ? » relance le flux OTP (vérification par
// SMS), « Créer un compte » ouvre l'inscription.
//
// Correctif clavier (Android) : même pattern que create-pin — input
// invisible mais dimensionné (jamais 1x1/opacity 0 seul) + focus différé.
export default function LoginScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const phoneNumber = useAuthStore((s) => s.phoneNumber);
  const setPhoneNumber = useAuthStore((s) => s.setPhoneNumber);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    // autoFocus peu fiable au montage : focus explicite différé.
    const t1 = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    // Store mémoire vide (redémarrage de l'app) : restaurer le dernier
    // numéro utilisé sur cet appareil depuis SecureStore.
    const restore = async () => {
      if (phoneNumber) return;
      const stored = await getStoredPhoneNumber();
      if (stored) {
        setPhoneNumber(stored);
      }
    };
    restore();
  }, [phoneNumber, setPhoneNumber]);

  const handleChange = (raw: string) => {
    const digitsOnly = raw.replace(/[^0-9]/g, '').slice(0, PIN_LENGTH);
    setPin(digitsOnly);
    if (error) setError(null);
    if (digitsOnly.length === PIN_LENGTH) {
      handleSubmit(digitsOnly);
    }
  };

  const handleSubmit = async (value: string) => {
    if (isSubmitting || !phoneNumber) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const { data } = await authApi.login(phoneNumber, value);
      if (data?.accessToken) {
        await setStoredAccessToken(data.accessToken);
      }
      // Hydrate le store avec le profil retourné par /auth/login.
      setUser({
        id: data.user.id,
        phoneNumber: data.user.phoneNumber,
        fullName: data.user.fullName,
        language: data.user.language === 'FR' ? 'fr' : 'en',
        kycStatus: data.user.kycStatus === 'VERIFIED' ? 'verified'
          : data.user.kycStatus === 'PENDING' ? 'pending'
          : data.user.kycStatus === 'REJECTED' ? 'rejected'
          : 'not_started',
        hasBiometricEnabled: false,
        trustScore: 50,
        preferredCurrency: 'XAF',
      } as never);
      router.replace('/(tabs)');
    } catch {
      setError(t('auth.loginPinError'));
      setPin('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPin = async () => {
    if (!phoneNumber) return;
    try {
      await authApi.requestOtp(phoneNumber);
      router.push({ pathname: '/(auth)/otp', params: { phoneNumber } });
    } catch {
      setError(t('auth.otpSendError'));
    }
  };

  const digits = Array.from({ length: PIN_LENGTH }, (_, i) => pin[i]);

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
          <FadeIn delay={200}>
            <Text style={styles.title}>{t('auth.loginTitle')}</Text>
            <Text style={styles.subtitle}>{t('auth.loginSubtitle')}</Text>

            {phoneNumber && (
              <Text style={styles.phoneEcho}>{phoneNumber}</Text>
            )}
          </FadeIn>

          <PopIn delay={280}>
            <Pressable onPress={() => inputRef.current?.focus()} style={styles.pinRow}>
              {digits.map((d, i) => (
                <View key={i} style={[styles.pinDot, d ? styles.pinDotFilled : null]}>
                  <Text style={styles.pinText}>{d ?? '·'}</Text>
                </View>
              ))}
            </Pressable>
          </PopIn>

          {isSubmitting ? (
            <ActivityIndicator color={colors.gold} style={styles.spinner} />
          ) : (
            error ? <Text style={styles.errorText}>{error}</Text> : null
          )}

          {/* Champ réel, invisible mais dimensionné (cf. create-pin). */}
          <TextInput
            ref={inputRef}
            value={pin}
            onChangeText={handleChange}
            keyboardType="number-pad"
            maxLength={PIN_LENGTH}
            contextMenuHidden
            style={styles.hiddenInput}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <AppButton
          label={isSubmitting ? t('common.continue') + '…' : t('common.continue')}
          onPress={() => handleSubmit(pin)}
          disabled={isSubmitting || pin.length !== PIN_LENGTH}
        />
        <View style={styles.linksRow}>
          <Pressable onPress={handleForgotPin} hitSlop={8}>
            <Text style={styles.link}>{t('auth.forgotPinLink')}</Text>
          </Pressable>
          <Text style={styles.linkSeparator}>·</Text>
          <Pressable onPress={() => router.push('/(auth)/create-account')} hitSlop={8}>
            <Text style={styles.link}>{t('auth.createAccount.linkLabel')}</Text>
          </Pressable>
        </View>
      </View>
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
    textAlign: 'center',
  },
  tagline: {
    fontFamily: fonts.inter.regular,
    fontSize: 12.5,
    color: colors.lavender,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.xl,
  },
  form: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.fraunces.semiBold,
    fontSize: 22,
    color: colors.white,
    marginBottom: spacing.xs + 2,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.inter.regular,
    fontSize: 12.5,
    color: colors.lavender,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  phoneEcho: {
    fontFamily: fonts.mono.medium,
    fontSize: 13,
    color: colors.gold,
    marginBottom: spacing.lg,
    letterSpacing: 0.5,
  },
  pinRow: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  pinDot: {
    width: 46,
    height: 54,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.navyMedium,
    backgroundColor: colors.navyDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDotFilled: {
    borderColor: colors.gold,
    backgroundColor: colors.navyDark,
  },
  pinText: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 20,
    color: colors.white,
  },
  spinner: {
    marginTop: spacing.sm,
  },
  errorText: {
    fontFamily: fonts.inter.medium,
    fontSize: 11.5,
    color: colors.danger,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  hiddenInput: {
    // Invisible mais dimensionné : Android refuse d'ouvrir le clavier
    // sur une vue 1x1 / opacity 0. Couvre la zone de saisie.
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
  },
  footer: {
    paddingHorizontal: spacing.md + 2,
    paddingTop: spacing.sm,
    backgroundColor: colors.navy,
  },
  linksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm + 2,
  },
  link: {
    fontFamily: fonts.inter.bold,
    fontSize: 11.5,
    color: colors.gold,
  },
  linkSeparator: {
    color: colors.navySoft,
    fontSize: 11.5,
  },
});
