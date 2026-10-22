import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme';

interface Props {
  /** Variante claire : bouton crème à bordure sable, flèche navy (fonds cream). */
  variant?: 'light' | 'dark';
  /** Par défaut : router.back(). À surcharger pour un retour spécifique. */
  onPress?: () => void;
}

/**
 * Bouton retour standard de l'app. La flèche est un tracé SVG et non un
 * caractère : le glyphe U+2190 (←) est absent des polices Inter/Fraunces
 * et se rend en glyphe cassé (« D ») sur certains appareils Android —
 * corrige le bug vu sur l'écran KYC intro. Position absolute, hors flux :
 * ne pousse plus le contenu ni ne chevauche la barre de statut.
 */
export function BackButton({ variant = 'light', onPress }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const stroke = variant === 'light' ? colors.navyDark : colors.white;

  return (
    <Pressable
      style={[styles.btn, { top: insets.top + 12 }, variant === 'dark' && styles.btnDark]}
      onPress={onPress ?? (() => router.back())}
      hitSlop={12}
    >
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path
          d="M15 5l-7 7 7 7"
          stroke={stroke}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    left: 20,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.sand,
    backgroundColor: colors.creamLight,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  btnDark: {
    borderColor: 'rgba(255,255,255,.18)',
    backgroundColor: 'rgba(255,255,255,.12)',
  },
});
