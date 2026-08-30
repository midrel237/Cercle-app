import React from 'react';
import { ScreenPlaceholder } from '../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={33}
      title="Paiement en cours"
      description="Traitement du paiement Mobile Money."
    />
  );
}
