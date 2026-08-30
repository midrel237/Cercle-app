import React from 'react';
import { ScreenPlaceholder } from '../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={63}
      title="Paramètres"
      description="Réglages du compte et de l'application."
    />
  );
}
