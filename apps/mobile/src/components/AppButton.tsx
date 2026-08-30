import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, fonts, radii, spacing } from '../theme';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'dark' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
}

/** Bouton principal des maquettes : .btn.primary (or) / .btn.dark (navy) / .btn.ghost (contour). */
export function AppButton({ label, onPress, variant = 'primary', disabled, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'dark' && styles.dark,
        variant === 'ghost' && styles.ghost,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
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
  pressed: { opacity: 0.85 },
  label: { fontFamily: fonts.inter.semiBold, fontSize: 14 },
  labelOnGold: { color: colors.navyDark },
  labelOnDark: { color: colors.white },
  labelGhost: { color: colors.navy },
});
