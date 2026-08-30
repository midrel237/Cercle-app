import React from 'react';
import { ScreenPlaceholder } from '../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={28}
      title="Demande envoyée"
      description="En attente de validation par l'administrateur."
    />
  );
}
