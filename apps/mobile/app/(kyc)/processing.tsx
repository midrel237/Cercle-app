import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FadeIn, Stagger, StaggerItem } from '../../src/components/motion';
import { kycApi, KycStatus } from '../../src/services/endpoints/kyc';
import { colors, fonts, radii, spacing } from '../../src/theme';

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 40; // ~2 minutes avant abandon

// Écran 13 — Analyse en cours (maquette) : les 4 étapes de la vérification
// s'illuminent au fil de l'analyse, pendant que l'on interroge
// GET /kyc/me/status toutes les 3 s : le backend applique le webhook
// s'il est arrivé, sinon interroge Didit en direct (secours).
// VERIFIED -> success (avec verifiedAt transmis pour l'écran 14),
// REJECTED -> rejected. Timeout -> retour au choix du document.
export default function KycProcessingScreen() {
  const { t } = useTranslation();
  const pollCount = useRef(0);
  const navigating = useRef(false);
  // Étape d'analyse simulée : progresse pendant que le polling tourne.
  const [step, setStep] = useState(0);

  // Progression visuelle des 4 étapes de la maquette (approximativement
  // réparties sur la durée d'attente max) — purement indicative.
  useEffect(() => {
    const id = setInterval(() => {
      setStep((s) => (s < 3 ? s + 1 : s));
    }, 6000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const route = (status: KycStatus, verifiedAt?: string | null) => {
      if (cancelled || navigating.current) return;
      navigating.current = true;
      if (status === 'VERIFIED') {
        router.replace({
          pathname: '/(kyc)/success',
          params: verifiedAt ? { verifiedAt } : undefined,
        });
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
          route(data.status, data.verifiedAt);
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

  const steps = [
    { label: t('kyc.processing.step1') },
    { label: t('kyc.processing.step2') },
    { label: t('kyc.processing.step3') },
    { label: t('kyc.processing.step4') },
  ];

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.goldDark} style={styles.spinner} />
      <Text style={styles.title}>{t('kyc.processing.title')}</Text>
      <Text style={styles.subtitle}>{t('kyc.processing.subtitle')}</Text>

      <Stagger style={styles.stepList}>
        {steps.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <StaggerItem key={i}>
              <View style={styles.stepRow}>
                <View
                  style={[
                    styles.stepDot,
                    done && styles.stepDotDone,
                    active && styles.stepDotActive,
                  ]}
                >
                  {done && <Text style={styles.stepDotText}>✓</Text>}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    done && styles.stepLabelDone,
                    active && styles.stepLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {s.label}
                </Text>
              </View>
            </StaggerItem>
          );
        })}
      </Stagger>
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
    marginBottom: spacing.md,
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
    marginBottom: spacing.xl,
  },
  stepList: {
    width: '100%',
    maxWidth: 320,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: colors.sand,
    backgroundColor: colors.creamLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    borderColor: colors.goldDark,
    backgroundColor: colors.goldDark,
  },
  stepDotActive: {
    borderColor: colors.goldDark,
  },
  stepDotText: {
    color: colors.white,
    fontSize: 14,
    fontFamily: fonts.inter.bold,
  },
  stepLabel: {
    flex: 1,
    fontFamily: fonts.inter.regular,
    fontSize: 13,
    color: colors.inkSoft,
  },
  stepLabelDone: {
    color: colors.navyDark,
    fontFamily: fonts.inter.medium,
  },
  stepLabelActive: {
    color: colors.navyDark,
    fontFamily: fonts.inter.semiBold,
  },
});
