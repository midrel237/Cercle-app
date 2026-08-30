import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../theme';

interface Props {
  size?: number;
  /** Index (0-5) du membre "actif" mis en avant sur la roue. */
  activeIndex?: number;
}

/**
 * Motif signature du produit (cf. cahier des charges, annexe UI) : une roue
 * à 6 points représentant les membres d'un groupe de tontine, avec un
 * repère (le point doré) qui indique le tour en cours. Réutilisé sur les
 * écrans de démarrage, bienvenue, et partout où l'on évoque la rotation.
 */
export function RotationMotif({ size = 120, activeIndex = 0 }: Props) {
  const center = size / 2;
  const radius = size * 0.4;
  const dotRadius = size * 0.05;
  const activeDotRadius = size * 0.058;

  const points = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  });

  const active = points[activeIndex % points.length];

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={center} cy={center} r={radius} fill="none" stroke={colors.navyMedium} strokeWidth={2} />
      <Path
        d={`M${center},${center} L${active.x},${active.y}`}
        stroke={colors.gold}
        strokeWidth={1.5}
        strokeDasharray="2 3"
      />
      {points.map((p, i) =>
        i === activeIndex % points.length ? (
          <Circle key={i} cx={p.x} cy={p.y} r={activeDotRadius} fill={colors.gold} />
        ) : (
          <Circle key={i} cx={p.x} cy={p.y} r={dotRadius} fill={colors.navyLight} />
        ),
      )}
    </Svg>
  );
}
