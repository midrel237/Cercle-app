import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, fonts, radii, spacing } from '../theme';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'dark' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
}

/**
 * Bouton principal des maquettes : .btn.primary (or) / .btn.dark (navy) /
 * .btn.ghost (contour). Micro-animation : le bouton se rétracte
 * légèrement (spring 0.97) au toucher — feedback tactile sur tous les
 * écrans de l'application.
 */
export function AppButton({ label, onPress, variant = 'primary', disabled, style }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (to: number) => {
    Animated.spring(scale, {
      toValue: to,
      speed: 24,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => !disabled && animate(0.96)}
      onPressOut={() => animate(1)}
    >
      <Animated.View
        style={[
          styles.base,
          variant === 'primary' && styles.primary,
          variant === 'dark' && styles.dark,
          variant === 'ghost' && styles.ghost,
          disabled && styles.disabled,
          { transform: [{ scale }] },
          style,
        ]}
      >
        <Text
          style={[
            styles.label,
            variant === 'primary' && styles.labelOnGold,
            variant === 'dark' && styles.labelOnDark,
            variant === 'ghost' && styles.labelGhost,
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    paddingVertical: spacing.md - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.gold },
  dark: { backgroundColor: colors.navy },
  ghost: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.sand },
  disabled: { opacity: 0.5 },
  label: { fontFamily: fonts.inter.semiBold, fontSize: 14 },
  labelOnGold: { color: colors.navyDark },
  labelOnDark: { color: colors.white },
  labelGhost: { color: colors.navy },
});
