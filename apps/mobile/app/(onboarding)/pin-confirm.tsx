import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { KycProgressHeader } from '../../src/components/KycProgressHeader';
import { authApi } from '../../src/services/endpoints/auth';
import { useAuthStore } from '../../src/store/auth.store';
import { colors, fonts, radii, spacing } from '../../src/theme';

const PIN_LENGTH = 4;

// Écran 17 — Confirmation du code PIN.
// Ressaisie du code défini à l'écran 16 : si les deux correspondent, le
// PIN est envoyé au backend via POST /auth/pin/create (phoneNumber mémorisé
// dans useAuthStore depuis la vérification OTP, + pin). Le backend le
// hash (bcrypt) dans user.pinHash — la session JWT déjà ouverte reste
// valide, aucun renouvellement de token n'est nécessaire. En cas de
// non-correspondance : retour à l'écran 16 pour recommencer la saisie.
//
// Correctif clavier (Android) : même bug que create-pin — l'input caché
// 1x1/opacity 0 n'ouvrait pas le clavier. Input invisible mais
// dimensionné + focus différé au montage.
export default function PinConfirmScreen() {
  const { t } = useTranslation();
  const { pin: firstPin } = useLocalSearchParams<{ pin?: string }>();
  const phoneNumber = useAuthStore((s) => s.phoneNumber);
  const inputRef = useRef<TextInput>(null);
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // autoFocus peu fiable au montage : focus explicite différé.
    const t1 = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t1);
  }, []);

  const handleChange = (raw: string) => {
    const digitsOnly = raw.replace(/[^0-9]/g, '').slice(0, PIN_LENGTH);
    setPin(digitsOnly);
    if (error) setError(null);
    if (digitsOnly.length === PIN_LENGTH) {
      handleSubmit(digitsOnly);
    }
  };

  const handleSubmit = async (value: string) => {
    if (isSubmitting) return;
    if (value !== firstPin) {
      setError(t('onboarding.pinConfirm.mismatchError'));
      setTimeout(() => router.replace('/(onboarding)/create-pin'), 1200);
      return;
    }
    if (!phoneNumber) {
      setError(t('onboarding.pinConfirm.missingPhoneError'));
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await authApi.createPin(phoneNumber, value);
      router.replace('/(onboarding)/biometric-setup');
    } catch {
      setError(t('onboarding.pinConfirm.serverError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <KycProgressHeader stepLabel={t('onboarding.pinConfirm.stepLabel')} progress={1} />

      <View style={styles.content}>
        <Text style={styles.emoji}>🔑</Text>
        <Text style={styles.title}>{t('onboarding.pinConfirm.title')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.pinConfirm.subtitle')}</Text>

        <Pressable onPress={() => inputRef.current?.focus()} style={styles.pinRow}>
          {Array.from({ length: PIN_LENGTH }, (_, i) => (
            <View
              key={i}
              style={[
                styles.pinDot,
                pin.length > i && styles.pinDotFilled,
                pin.length === i && styles.pinDotActive,
              ]}
            >
              <Text style={styles.pinText}>{pin[i] ?? ''}</Text>
            </View>
          ))}
        </Pressable>

        {isSubmitting ? (
          <ActivityIndicator size="large" color={colors.goldDark} style={styles.spinner} />
        ) : (
          error && <Text style={styles.errorText}>{error}</Text>
        )}

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
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emoji: {
    fontSize: 36,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.fraunces.semiBold,
    fontSize: 19,
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
  pinRow: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
  },
  pinDot: {
    width: 46,
    height: 54,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.sand,
    backgroundColor: colors.creamLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDotFilled: {
    borderColor: colors.goldDark,
    backgroundColor: colors.cream,
  },
  pinDotActive: {
    borderColor: colors.goldDark,
  },
  pinText: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 20,
    color: colors.navyDark,
  },
  spinner: {
    marginTop: spacing.md,
  },
  errorText: {
    fontFamily: fonts.inter.medium,
    fontSize: 11.5,
    color: colors.danger,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  hiddenInput: {
    // Invisible mais dimensionné : Android refuse d'ouvrir le clavier sur
    // une vue 1x1 px / opacity 0. L'input couvre la zone de saisie en
    // transparent : un tap n'importe où ouvre directement le clavier.
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
  },
});
