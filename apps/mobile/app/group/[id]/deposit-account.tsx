import React from 'react';
import { ScreenPlaceholder } from '../../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={68}
      title="Compte de dépôt du groupe (caissier)"
      description="Le caissier lie son compte Mobile Money : les cotisations y sont versées avant reversement au bénéficiaire."
    />
  );
}
