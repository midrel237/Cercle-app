import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { KycProgressHeader } from '../../src/components/KycProgressHeader';
import { colors, fonts, radii, spacing } from '../../src/theme';

const PIN_LENGTH = 4;

// Écran 16 — Création du code PIN de sécurité.
// Première étape de l'onboarding post-KYC : l'utilisateur définit le code
// qui protégera l'app à chaque ouverture (POST /auth/login). La saisie
// s'effectue via un champ numérique masqué (point par chiffre), façon
// maquette ; la validation se fait sur l'écran suivant (17) par
// confirmation. Rien n'est encore envoyé au serveur ici.
export default function CreatePinScreen() {
  const { t } = useTranslation();
  const inputRef = useRef<TextInput>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleChange = (raw: string) => {
    const digitsOnly = raw.replace(/[^0-9]/g, '').slice(0, PIN_LENGTH);
    setPin(digitsOnly);
    if (error) setError(null);
    if (digitsOnly.length === PIN_LENGTH) {
      router.push({ pathname: '/(onboarding)/pin-confirm', params: { pin: digitsOnly } });
    }
  };

  return (
    <View style={styles.container}>
      <KycProgressHeader stepLabel={t('onboarding.createPin.stepLabel')} progress={1} />

      <View style={styles.content}>
        <Text style={styles.emoji}>🔐</Text>
        <Text style={styles.title}>{t('onboarding.createPin.title')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.createPin.subtitle')}</Text>

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

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TextInput
          ref={inputRef}
          value={pin}
          onChangeText={handleChange}
          keyboardType="number-pad"
          maxLength={PIN_LENGTH}
          autoFocus
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
  errorText: {
    fontFamily: fonts.inter.medium,
    fontSize: 11.5,
    color: colors.danger,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
