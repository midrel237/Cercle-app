import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton } from '../../src/components/AppButton';
import { RotationMotif } from '../../src/components/RotationMotif';
import { FadeIn, PopIn } from '../../src/components/motion';
import { authApi } from '../../src/services/endpoints/auth';
import { setStoredAccessToken, setStoredPhoneNumber } from '../../src/services/api-client';
import { useAuthStore } from '../../src/store/auth.store';
import { colors, fonts, radii, spacing } from '../../src/theme';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 45;

// Écran 5 — Vérification du code SMS (OTP).
// Suite directe de l'écran 4 : le numéro de téléphone est reçu en
// paramètre de navigation. Un seul champ caché capture la saisie, projetée
// sur 6 cases visuelles façon maquette. La vérification se déclenche
// automatiquement dès que les 6 chiffres sont saisis.
//
// Le numéro vérifié est persisté en SecureStore : le login PIN-first
// (écran 4) en a besoin à la prochaine ouverture, même après un
// redémarrage de l'app (le store zustand est en mémoire).
//
// Correctifs UI : le motif signature remplace l'emoji 💬 (rendu cassé en
// rectangle compressé sur certains appareils), safe-area sur le padding
// haut, ScrollView pour les petits écrans + clavier, micro-animations
// (FadeIn pour le texte, PopIn sur les cases du code).
export default function OtpScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { phoneNumber } = useLocalSearchParams<{ phoneNumber?: string }>();
  const setPhoneNumber = useAuthStore((s) => s.setPhoneNumber);
  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const handleVerify = async (value: string) => {
    if (!phoneNumber || value.length !== CODE_LENGTH || isVerifying) return;
    setError(null);
    setIsVerifying(true);
    try {
      const { data } = await authApi.verifyOtp(phoneNumber, value);
      if (data?.accessToken) {
        await setStoredAccessToken(data.accessToken);
      }
      setPhoneNumber(phoneNumber);
      // Persisté pour le login PIN-first de la prochaine session.
      await setStoredPhoneNumber(phoneNumber);
      router.replace('/(kyc)/intro');
    } catch {
      setError(t('auth.otp.verifyError'));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleChangeCode = (raw: string) => {
    const digitsOnly = raw.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH);
    setCode(digitsOnly);
    if (error) setError(null);
    if (digitsOnly.length === CODE_LENGTH) {
      handleVerify(digitsOnly);
    }
  };

  const handleResend = async () => {
    if (secondsLeft > 0 || !phoneNumber) return;
    setError(null);
    setCode('');
    try {
      await authApi.requestOtp(phoneNumber);
      setSecondsLeft(RESEND_SECONDS);
    } catch {
      setError(t('auth.otp.resendError'));
    }
  };

  const digits = Array.from({ length: CODE_LENGTH }, (_, i) => code[i]);
  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const seconds = String(secondsLeft % 60).padStart(2, '0');

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <RotationMotif size={56} activeIndex={1} animated delay={60} />
        <FadeIn delay={140}>
          <Text style={styles.title}>{t('auth.otp.title')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.otp.subtitle')}
            {'\n'}
            <Text style={styles.phone}>{phoneNumber ?? ''}</Text>
          </Text>
        </FadeIn>

        <PopIn delay={260}>
          <Pressable onPress={() => inputRef.current?.focus()} style={styles.otpRow}>
            {digits.map((d, i) => (
              <View key={i} style={[styles.digitBox, d ? styles.digitBoxFilled : null]}>
                <Text style={styles.digitText}>{d ?? '·'}</Text>
              </View>
            ))}
          </Pressable>
        </PopIn>

        {/* Champ réel, invisible : capte la saisie clavier numérique. */}
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={handleChangeCode}
          keyboardType="number-pad"
          maxLength={CODE_LENGTH}
          autoFocus
          style={styles.hiddenInput}
        />

        {error ? (
          <FadeIn>
            <Text style={styles.errorText}>{error}</Text>
          </FadeIn>
        ) : secondsLeft > 0 ? (
          <Text style={styles.resendText}>
            {t('auth.otp.resendIn')}{' '}
            <Text style={styles.resendTimer}>
              {minutes}:{seconds}
            </Text>
          </Text>
        ) : (
          <Pressable onPress={handleResend} hitSlop={8}>
            <Text style={styles.resendLink}>{t('auth.otp.resendAction')}</Text>
          </Pressable>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <AppButton
          label={isVerifying ? t('auth.otp.verifying') : t('auth.otp.verifyButton')}
          onPress={() => handleVerify(code)}
          disabled={isVerifying || code.length !== CODE_LENGTH}
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
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontFamily: fonts.fraunces.semiBold,
    fontSize: 19,
    color: colors.navyDark,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.inter.regular,
    fontSize: 12,
    color: colors.inkSoft,
    textAlign: 'center',
    lineHeight: 18,
  },
  phone: {
    fontFamily: fonts.inter.bold,
    color: colors.navyDark,
  },
  otpRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg - 2,
    marginBottom: spacing.sm + 2,
  },
  digitBox: {
    width: 38,
    height: 46,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.sand,
    backgroundColor: colors.creamLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitBoxFilled: {
    borderColor: colors.goldDark,
    backgroundColor: colors.cream,
  },
  digitText: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 18,
    color: colors.navyDark,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  resendText: {
    fontFamily: fonts.inter.regular,
    fontSize: 11.5,
    color: colors.inkSoft,
  },
  resendTimer: {
    fontFamily: fonts.inter.bold,
    color: colors.navyDark,
  },
  resendLink: {
    fontFamily: fonts.inter.bold,
    fontSize: 11.5,
    color: colors.goldDark,
  },
  errorText: {
    fontFamily: fonts.inter.medium,
    fontSize: 11.5,
    color: colors.danger,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing.md + 2,
  },
});
