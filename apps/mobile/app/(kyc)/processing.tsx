import React from 'react';
import { ScreenPlaceholder } from '../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={13}
      title="Traitement KYC"
      description="Vérification en cours."
    />
  );
}
