import React from 'react';
import { ScreenPlaceholder } from '../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={6}
      title="Introduction KYC"
      description="Explication de la vérification d'identité."
    />
  );
}
