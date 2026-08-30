import React from 'react';
import { ScreenPlaceholder } from '../../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={60}
      title="Cycle terminé"
      description="Fin d'un cycle de rotation."
    />
  );
}
