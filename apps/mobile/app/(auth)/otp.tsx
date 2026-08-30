import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton } from '../../src/components/AppButton';
import { authApi } from '../../src/services/endpoints/auth';
import { setStoredAccessToken } from '../../src/services/api-client';
import { colors, fonts, radii, spacing } from '../../src/theme';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 45;

// Écran 5 — Vérification du code SMS (OTP).
// Suite directe de l'écran 4 : le numéro de téléphone est reçu en
// paramètre de navigation. Un seul champ caché capture la saisie, projetée
// sur 6 cases visuelles façon maquette. La vérification se déclenche
// automatiquement dès que les 6 chiffres sont saisis (comme sur la plupart
// des apps mobiles), sans attendre un appui sur « Vérifier ».
//
// ⚠ Historique : le serveur (POST /auth/otp/verify) a longtemps été un
// stub qui acceptait tout code — voir §7/§8 du document de compréhension.
// Il vérifie désormais un vrai code à 6 chiffres, hashé et expirant après
// 5 minutes (voir auth.service.ts côté backend), et renvoie un jeton JWT
// stocké ici dès la vérification réussie.
export default function OtpScreen() {
  const { t } = useTranslation();
  const { phoneNumber } = useLocalSearchParams<{ phoneNumber?: string }>();
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
      <View style={styles.content}>
        <Text style={styles.emoji}>💬</Text>
        <Text style={styles.title}>{t('auth.otp.title')}</Text>
        <Text style={styles.subtitle}>
          {t('auth.otp.subtitle')}
          {'\n'}
          <Text style={styles.phone}>{phoneNumber ?? ''}</Text>
        </Text>

        <Pressable onPress={() => inputRef.current?.focus()} style={styles.otpRow}>
          {digits.map((d, i) => (
            <View key={i} style={[styles.digitBox, d ? styles.digitBoxFilled : null]}>
              <Text style={styles.digitText}>{d ?? '·'}</Text>
            </View>
          ))}
        </Pressable>

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
          <Text style={styles.errorText}>{error}</Text>
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
      </View>

      <View style={styles.footer}>
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
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: spacing.xl,
  },
  emoji: {
    fontSize: 30,
    marginBottom: spacing.sm + 2,
  },
  title: {
    fontFamily: fonts.fraunces.semiBold,
    fontSize: 19,
    color: colors.navyDark,
    marginBottom: spacing.sm,
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
    paddingBottom: 20,
  },
});
