import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TextProps,
  View,
  ViewStyle,
} from 'react-native';
import { colors, fonts } from '../theme';

/**
 * Bibliotheque de micro-animations Cercle - la maquette precise que
 * chaque ecran integre des micro-animations, la roue de rotation comme
 * motif signature. API Animated native : zero dependance ajoutee.
 *
 * Composants :
 * - FadeIn      : apparition en fondu (+ translation optionnelle)
 * - Stagger     : liste en cascade (chaque enfant decale de step ms)
 * - PopIn       : ressort (succes, badges, cartes de score)
 * - CountUp     : montant qui compte de 0 a sa valeur
 * - PressableScale : touchable qui se retracte au toucher
 * - RotationPulse : la roue signature, rotation lente en boucle
 * - GlowPulse   : halo pulse autour d'une carte cle
 */

// ---------------------------------------------------------------- FadeIn ---

export function FadeIn({
  children,
  delay = 0,
  dy = 0,
  duration = 320,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  dy?: number;
  duration?: number;
  style?: ViewStyle;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(dy)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  }, [opacity, translateY, delay, duration]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

// --------------------------------------------------------------- Stagger ---

/**
 * Liste en cascade : chaque enfant apparait decale de step ms. Wrapper
 * les cartes/rangees d'une liste - pattern signature des maquettes.
 */
export function Stagger({
  children,
  step = 60,
  initialDelay = 80,
  style,
}: {
  children: React.ReactNode;
  step?: number;
  initialDelay?: number;
  style?: ViewStyle;
}) {
  return (
    <View style={style}>
      {React.Children.map(children, (child, i) => {
        if (!React.isValidElement(child)) return child;
        return (
          <FadeIn key={child.key ?? i} delay={initialDelay + i * step} dy={14}>
            {child}
          </FadeIn>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------- PopIn ---

/** Ressort de type spring - succes, badges, icones de validation. */
export function PopIn({
  children,
  delay = 0,
  scale = 0.6,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  scale?: number;
  style?: ViewStyle;
}) {
  const a = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(a, {
      toValue: 1,
      speed: 14,
      bounciness: 7,
      delay,
      useNativeDriver: true,
    }).start();
  }, [a, delay]);

  const interp = a.interpolate({
    inputRange: [0, 1],
    outputRange: [scale, 1],
  });

  return (
    <Animated.View style={[style, { opacity: a, transform: [{ scale: interp }] }]}>
      {children}
    </Animated.View>
  );
}

// --------------------------------------------------------------- CountUp ---

/**
 * Montant qui compte de 0 a sa valeur - les gros chiffres des maquettes
 * (TOUR ACTUEL, RESTE A REMBOURSER, COLLECTE). Formate en fr-FR.
 */
export function CountUp({
  value,
  duration = 900,
  delay = 150,
  prefix = '',
  suffix = '',
  style,
}: {
  value: number;
  duration?: number;
  delay?: number;
  prefix?: string;
  suffix?: string;
  style?: TextProps['style'];
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!Number.isFinite(value) || value <= 0) {
      setDisplay(Number.isFinite(value) ? Math.round(value) : 0);
      return;
    }
    const a = new Animated.Value(0);
    const listener = a.addListener(({ value: v }) => setDisplay(Math.round(v)));
    Animated.timing(a, {
      toValue: value,
      duration,
      delay,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    }).start(() => a.removeListener(listener));
    return () => a.removeListener(listener);
  }, [value, duration, delay]);

  return (
    <Text style={[style, { fontFamily: fonts.mono.semiBold }]}>
      {prefix}
      {display.toLocaleString('fr-FR')}
      {suffix}
    </Text>
  );
}

// -------------------------------------------------------- PressableScale ---

/** Touchable qui se retracte legerement au toucher (feedback doux). */
export function PressableScale({
  children,
  onPress,
  disabled,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (to: number) => {
    Animated.spring(scale, {
      toValue: to,
      speed: 20,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => animate(0.97)}
      onPressOut={() => animate(1)}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// --------------------------------------------------------- RotationPulse ---

/**
 * La roue de rotation, motif signature du produit. Cercle dore qui
 * tourne lentement en boucle - decoratif, leger.
 */
export function RotationPulse({
  size = 28,
  color = colors.gold,
  style,
}: {
  size?: number;
  color?: string;
  style?: ViewStyle;
}) {
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 9000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, [rotate]);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View
      style={[
        styles.rotationRing,
        { width: size, height: size, borderRadius: size / 2, borderColor: color },
        { transform: [{ rotate: spin }] },
        style,
      ]}
    />
  );
}

// --------------------------------------------------------------- GlowPulse ---

/** Halo pulsee autour d'une carte cle (cagnotte ouverte, score). */
export function GlowPulse({
  children,
  color = colors.gold,
  delay = 0,
}: {
  children: React.ReactNode;
  color?: string;
  delay?: number;
}) {
  const a = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 1600, delay, useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ]),
    ).start();
  }, [a, delay]);

  const shadowOpacity = a.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] });

  return (
    <Animated.View style={{ shadowColor: color, shadowOpacity, shadowRadius: 14, shadowOffset: { width: 0, height: 2 }, elevation: 6 }}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  rotationRing: {
    borderWidth: 2,
    borderTopColor: 'transparent',
    borderLeftColor: 'transparent',
  },
});
