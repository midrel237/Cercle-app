import React from 'react';
import { ScreenPlaceholder } from '../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={32}
      title="Code PIN Mobile Money"
      description="Confirmation du paiement par PIN."
    />
  );
}
