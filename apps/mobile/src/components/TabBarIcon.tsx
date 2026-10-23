import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { ColorValue } from 'react-native';
import { colors } from '../theme';

export type TabIconName = 'home' | 'loans' | 'history' | 'profile';

interface Props {
  name: TabIconName;
  size?: number;
  /** ColorValue : le callback tabBarIcon d'expo-router fournit un
   * ColorValue (souvent OpaqueColorValue via StyleSheet), pas un string. */
  color?: ColorValue;
}

/**
 * Icônes de la barre d'onglets — dessinées en SVG stroke (comme le reste
 * de l'app : DocumentIcon, RotationMotif) plutôt qu'en emojis, dont le
 * rendu est cassé sur certains appareils Android (rectangle compressé).
 */
export function TabBarIcon({ name, size = 24, color = colors.navyDark }: Props) {
  const common = {
    stroke: color as string,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'home' && (
        <>
          <Path d="M4 11.5 12 4l8 7.5" {...common} />
          <Path d="M6 10.8V20h12v-9.2" {...common} />
          <Path d="M10 20v-5h4v5" {...common} />
        </>
      )}
      {name === 'loans' && (
        <>
          <Path d="M3 6.5h18v13H3z" {...common} />
          <Path d="M3 10.5h18" {...common} />
          <Path d="M7 15h6" {...common} />
        </>
      )}
      {name === 'history' && (
        <>
          <Path d="M12 4a8 8 0 1 1-7.6 5.5" {...common} />
          <Path d="M4 3.5 4.7 9l5.3-.6" {...common} />
          <Path d="M12 8v4.5l3 2" {...common} />
        </>
      )}
      {name === 'profile' && (
        <>
          <Path d="M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" {...common} />
          <Path d="M4.5 20c1.2-3.5 4-5.5 7.5-5.5s6.3 2 7.5 5.5" {...common} />
        </>
      )}
    </Svg>
  );
}
