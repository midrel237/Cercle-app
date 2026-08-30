import React from 'react';
import { ScreenPlaceholder } from '../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={20}
      title="Sécurité"
      description="Récapitulatif des réglages de sécurité."
    />
  );
}
