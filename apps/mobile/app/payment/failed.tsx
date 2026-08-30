import React from 'react';
import { ScreenPlaceholder } from '../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={37}
      title="Paiement échoué"
      description="Le paiement n'a pas abouti."
    />
  );
}
