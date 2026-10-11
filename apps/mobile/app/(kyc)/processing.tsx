import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { RotationMotif } from '../../src/components/RotationMotif';
import { kycApi, KycStatus } from '../../src/services/endpoints/kyc';
import { colors, fonts, spacing } from '../../src/theme';

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 40; // ~2 minutes avant abandon

// Écran 13 — Attente de la décision Didit.
// Après le retour du flux hébergé (deep link cercle://kyc/return), on
// interroge GET /kyc/me/status toutes les 3 s : le backend applique le
// webhook s'il est arrivé, sinon interroge Didit en direct (secours).
// VERIFIED -> success, REJECTED -> rejected. Timeout -> retour au choix
// du document ; l'utilisateur peut relancer sans perdre son compte.
export default function KycProcessingScreen() {
  const { t } = useTranslation();
  const pollCount = useRef(0);
  const navigating = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const route = (status: KycStatus) => {
      if (cancelled || navigating.current) return;
      navigating.current = true;
      if (status === 'VERIFIED') {
        router.replace('/(kyc)/success');
      } else if (status === 'REJECTED') {
        router.replace('/(kyc)/rejected');
      } else {
        // NONE (aucune session en cours) ou PENDING persistant :
        // retour au choix du document pour relancer la vérification.
        router.replace('/(kyc)/document-choice');
      }
    };

    const poll = async () => {
      pollCount.current += 1;
      if (pollCount.current > MAX_POLLS) {
        route('PENDING');
        return;
      }
      try {
        const { data } = await kycApi.getStatus();
        if (data.status === 'VERIFIED' || data.status === 'REJECTED') {
          route(data.status);
          return;
        }
      } catch {
        // Erreur réseau ponctuelle : on retente au tick suivant.
      }
      setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={styles.container}>
      <RotationMotif />
      <ActivityIndicator size="large" color={colors.goldDark} style={styles.spinner} />
      <Text style={styles.title}>{t('kyc.processing.title')}</Text>
      <Text style={styles.subtitle}>{t('kyc.processing.subtitle')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.creamLight,
    paddingHorizontal: spacing.md + 4,
  },
  spinner: {
    marginBottom: spacing.lg,
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
  },
});
