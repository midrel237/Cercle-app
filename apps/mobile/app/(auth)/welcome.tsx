import React, { useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../src/components/AppButton';
import { RotationMotif } from '../../src/components/RotationMotif';
import { colors, fonts, spacing } from '../../src/theme';

const { width } = Dimensions.get('window');

const SLIDES = [
  { activeIndex: 0, titleKey: 'discovery.welcome.slide1Title', bodyKey: 'discovery.welcome.slide1Body' },
  { activeIndex: 2, titleKey: 'discovery.welcome.slide2Title', bodyKey: 'discovery.welcome.slide2Body' },
  { activeIndex: 4, titleKey: 'discovery.welcome.slide3Title', bodyKey: 'discovery.welcome.slide3Body' },
] as const;

// Écran 3 — Carrousel de bienvenue (section Découverte)
// Trois écrans de présentation avant l'inscription. « Passer » et le
// dernier « Commencer » mènent tous deux vers la connexion (écran 4).
// Le motif de roue (RotationMotif) change de point actif à chaque slide,
// en écho au thème de la rotation entre membres.
export default function WelcomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  const goToLogin = () => router.replace('/(auth)/login');

  const handleNext = () => {
    if (isLast) {
      goToLogin();
      return;
    }
    const nextIndex = index + 1;
    scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
    setIndex(nextIndex);
  };

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(nextIndex);
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.skip, { top: insets.top + 12 }]}
        onPress={goToLogin}
        hitSlop={12}
      >
        <Text style={styles.skipLabel}>{t('common.skip')}</Text>
      </Pressable>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        style={styles.scroll}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <RotationMotif size={120} activeIndex={slide.activeIndex} />
            <Text style={styles.title}>{t(slide.titleKey)}</Text>
            <Text style={styles.body}>{t(slide.bodyKey)}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dotRow}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotOn]} />
        ))}
      </View>

      <View style={styles.footer}>
        <AppButton
          label={isLast ? t('common.getStarted') : t('common.next')}
          onPress={handleNext}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy,
  },
  skip: {
    position: 'absolute',
    right: 20,
    zIndex: 1,
  },
  skipLabel: {
    fontFamily: fonts.inter.semiBold,
    fontSize: 11,
    color: colors.lavender,
  },
  scroll: {
    flex: 1,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontFamily: fonts.fraunces.semiBold,
    fontSize: 22,
    color: colors.white,
    textAlign: 'center',
    marginTop: spacing.lg + 2,
    marginBottom: spacing.sm + 2,
  },
  body: {
    fontFamily: fonts.inter.regular,
    fontSize: 13,
    color: colors.lavender,
    textAlign: 'center',
    lineHeight: 20,
  },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.navyMedium,
  },
  dotOn: {
    width: 18,
    backgroundColor: colors.gold,
  },
  footer: {
    paddingHorizontal: spacing.md + 2,
    paddingBottom: 20,
  },
});
