import React from 'react';
import { ScreenPlaceholder } from '../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={14}
      title="KYC validé"
      description="Identité vérifiée avec succès."
    />
  );
}
