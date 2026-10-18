import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../../src/components/AppButton';
import { PopIn, FadeIn, CountUp, RotationPulse } from '../../../src/components/motion';
import { colors, fonts, radii, spacing } from '../../../src/theme';

/**
 * Écran 71 — Célébration de cycle terminé : groupe, cycle bouclé sans
 * défaut, montant total distribué (compteur animé), taux de remboursement
 * 100 %. Roue signature en rotation + particules confetti (API Animated,
 * 12 points dorés qui tombent — célébration sobre, sans dépendance).
 */
export default function CycleCompletedScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id, name, cycle, distributed } = useLocalSearchParams<{
    id: string;
    name?: string;
    cycle?: string;
    distributed?: string;
  }>();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Confetti />
      <View style={styles.content}>
        <RotationPulse size={44} />
        <PopIn delay={120}>
          <Text style={styles.icon}>🎉</Text>
          <Text style={styles.title}>{t('cycleCelebration.title')}</Text>
          <Text style={styles.subtitle}>
            {t('cycleCelebration.subtitle', {
              group: name ?? '',
              cycle: cycle ?? '',
            })}
          </Text>
        </PopIn>

        <PopIn delay={300} scale={0.85}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('cycleCelebration.distributedLabel')}</Text>
            <CountUp
              value={Number(distributed ?? 0)}
              suffix=" FCFA"
              duration={1200}
              style={styles.statValue}
            />
            <View style={styles.statDivider} />
            <Text style={styles.statLabel}>{t('cycleCelebration.repaymentRateLabel')}</Text>
            <FadeIn delay={700}>
              <Text style={[styles.statValue, { color: colors.success }]}>100 %</Text>
            </FadeIn>
          </View>
        </PopIn>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <AppButton
          label={t('cycleCelebration.newCycleButton')}
          onPress={() => router.replace({ pathname: '/group/[id]', params: { id } })}
        />
      </View>
    </View>
  );
}

/** Confettis : 12 points dorés/navy qui tombent en boucle, légers (opacity). */
function Confetti() {
  const confetti = Array.from({ length: 12 }, (_, i) => ({
    left: `${(i * 83) % 100}%`,
    delay: (i % 6) * 260,
    duration: 3200 + (i % 4) * 500,
    color: i % 3 === 0 ? colors.gold : i % 3 === 1 ? colors.goldDark : colors.navy,
  }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {confetti.map((c, i) => (
        <FallingDot key={i} {...c} />
      ))}
    </View>
  );
}

function FallingDot({
  left,
  delay,
  duration,
  color,
}: {
  left: string;
  delay: number;
  duration: number;
  color: string;
}) {
  const a = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration, delay, useNativeDriver: true }),
        Animated.timing(a, { toValue: -20, duration: 0, useNativeDriver: true }),
      ]),
    ).start();
  }, [a, delay, duration]);

  const top = a.interpolate({ inputRange: [0, 1], outputRange: [-20, 700] });
  const opacity = a.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 0.8, 0.8, 0] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left,
        top,
        opacity,
        width: 6,
        height: 10,
        borderRadius: 3,
        backgroundColor: color,
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.creamLight },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  icon: { fontSize: 46, marginBottom: spacing.md, textAlign: 'center' },
  title: { fontFamily: fonts.fraunces.semiBold, fontSize: 24, color: colors.navyDark, marginBottom: spacing.sm, textAlign: 'center' },
  subtitle: { fontFamily: fonts.inter.regular, fontSize: 12.5, color: colors.inkSoft, textAlign: 'center', lineHeight: 18, marginBottom: spacing.xl },
  statCard: {
    width: '100%', borderWidth: 1.5, borderColor: colors.goldDark, borderRadius: radii.md,
    backgroundColor: colors.cream, padding: spacing.md, alignItems: 'center',
  },
  statLabel: { fontFamily: fonts.inter.medium, fontSize: 10.5, color: colors.goldDark, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  statValue: { fontSize: 24, color: colors.navyDark, marginBottom: spacing.md },
  statDivider: { width: '100%', height: 1, backgroundColor: colors.sand, marginBottom: spacing.md },
  footer: { paddingHorizontal: spacing.md + 2 },
});
