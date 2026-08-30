import React from 'react';
import { ScreenPlaceholder } from '../../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={45}
      title="Rappel manuel"
      description="Envoyer un rappel de paiement."
    />
  );
}
