import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { AppButton } from '../../src/components/AppButton';
import { FadeIn, Stagger } from '../../src/components/motion';
import { authApi } from '../../src/services/endpoints/auth';
import { getStoredPhoneNumber } from '../../src/services/api-client';
import { useAuthStore } from '../../src/store/auth.store';
import { colors, fonts, radii, spacing } from '../../src/theme';

/**
 * Écran 20 — Sécurité & PIN (accessible depuis Paramètres et Profil).
 * Conforme maquette : « Modifier mon code PIN » (relance le flux OTP
 * SMS pour le numéro mémorisé — le PIN est redéfini après vérification
 * OTP, le backend ne stocke jamais le PIN en clair), biométrie
 * (bascule locale Expo Local Authentication, stockée en SecureStore),
 * appareils connectés et « Déconnecter tous les autres appareils »
 * (MVP JWT stateless : pas de registre de sessions — informationnel).
 */
export default function SecurityScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const phoneNumber = useAuthStore((s) => s.phoneNumber);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await SecureStore.getItemAsync('cercle_biometric_enabled');
      setBiometricEnabled(stored === 'true');
    })();
  }, []);

  const handleChangePin = async () => {
    if (sending) return;
    const target = phoneNumber ?? (await getStoredPhoneNumber());
    if (!target) {
      router.push('/(auth)/login');
      return;
    }
    setSendError(false);
    setSending(true);
    try {
      await authApi.requestOtp(target);
      router.push({ pathname: '/(auth)/otp', params: { phoneNumber: target } });
    } catch {
      setSendError(true);
    } finally {
      setSending(false);
    }
  };

  const toggleBiometric = (value: boolean) => {
    setBiometricEnabled(value);
    SecureStore.setItemAsync('cercle_biometric_enabled', value ? 'true' : 'false');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={router.back} hitSlop={12} style={styles.backRow}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </Pressable>

        <FadeIn dy={10}>
          <Text style={styles.title}>{t('securityScreen.title')}</Text>
        </FadeIn>

        <Stagger step={60}>
          {/* Modifier mon code PIN — maquette écran 20. */}
          <FadeIn delay={120} dy={10}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>{t('securityScreen.changePinLabel')}</Text>
              <Text style={styles.cardHint}>{t('securityScreen.changePinHint')}</Text>
              {sending ? (
                <View style={styles.sendingRow}>
                  <ActivityIndicator color={colors.goldDark} />
                  <Text style={styles.sendingText}>{t('securityScreen.changePinSending')}</Text>
                </View>
              ) : (
                <AppButton
                  label={t('securityScreen.changePinLabel')}
                  onPress={handleChangePin}
                  style={styles.changePinButton}
                />
              )}
              {sendError ? (
                <Text style={styles.errorText}>{t('securityScreen.changePinError')}</Text>
              ) : null}
            </View>
          </FadeIn>

          {/* Biométrie — bascule locale (SecureStore). */}
          <FadeIn delay={200} dy={10}>
            <View style={styles.card}>
              <View style={styles.pinRow}>
                <View style={styles.pinRowText}>
                  <Text style={styles.cardLabel}>{t('securityScreen.biometricLabel')}</Text>
                  <Text style={styles.cardHint}>
                    {biometricEnabled
                      ? t('securityScreen.biometricOn')
                      : t('securityScreen.biometricOff')}
                  </Text>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={toggleBiometric}
                  trackColor={{ false: colors.sand, true: colors.gold }}
                  thumbColor={colors.creamLight}
                />
              </View>
            </View>
          </FadeIn>

          {/* Appareils connectés — maquette : iPhone 13 (cet appareil)
              Actif · Samsung A14 — 12 juin. MVP JWT stateless : seul cet
              appareil est listé (pas de registre de sessions). */}
          <FadeIn delay={280} dy={10}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('securityScreen.devicesSection')}</Text>
              <View style={styles.deviceRow}>
                <Text style={styles.deviceName}>{t('securityScreen.thisDevice')}</Text>
                <Text style={styles.deviceStatus}>{t('securityScreen.active')}</Text>
              </View>
            </View>
          </FadeIn>

          {/* Déconnecter tous les autres appareils. */}
          <FadeIn delay={340} dy={10}>
            <Pressable
              style={styles.disconnectButton}
              onPress={() =>
                Alert.alert(
                  t('securityScreen.disconnectAlertTitle'),
                  t('securityScreen.disconnectAlertBody'),
                )
              }
            >
              <Text style={styles.disconnectText}>
                {t('securityScreen.disconnectAllLabel')}
              </Text>
            </Pressable>
          </FadeIn>
        </Stagger>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.creamLight },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  backRow: { alignSelf: 'flex-start', marginTop: spacing.sm, marginBottom: spacing.md },
  backText: { fontFamily: fonts.inter.medium, fontSize: 13, color: colors.navy },
  title: { fontFamily: fonts.fraunces.semiBold, fontSize: 24, color: colors.navyDark, marginBottom: spacing.lg },
  card: {
    borderWidth: 1, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, padding: spacing.md, marginBottom: spacing.md,
  },
  pinRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pinRowText: { flex: 1 },
  cardLabel: { fontFamily: fonts.inter.semiBold, fontSize: 14, color: colors.navyDark, marginBottom: 2 },
  cardHint: { fontFamily: fonts.inter.regular, fontSize: 11.5, color: colors.inkSoft, lineHeight: 16 },
  changePinButton: { marginTop: spacing.md },
  sendingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.md - 2, marginTop: spacing.sm,
  },
  sendingText: { fontFamily: fonts.inter.medium, fontSize: 12.5, color: colors.inkSoft },
  errorText: { fontFamily: fonts.inter.medium, fontSize: 11.5, color: colors.danger, marginTop: spacing.sm },
  sectionTitle: { fontFamily: fonts.fraunces.semiBold, fontSize: 15, color: colors.navyDark, marginBottom: spacing.sm },
  deviceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: colors.sand, borderRadius: radii.sm,
    paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.sm,
  },
  deviceName: { fontFamily: fonts.inter.medium, fontSize: 12.5, color: colors.navyDark },
  deviceStatus: { fontFamily: fonts.inter.semiBold, fontSize: 11, color: colors.success },
  disconnectButton: {
    borderWidth: 1.5, borderColor: colors.danger, borderRadius: radii.md,
    alignItems: 'center', paddingVertical: spacing.sm + 4, marginTop: spacing.xs,
  },
  disconnectText: { fontFamily: fonts.inter.semiBold, fontSize: 13.5, color: colors.danger },
});
