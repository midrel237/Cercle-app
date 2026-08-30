import React from 'react';
import { ScreenPlaceholder } from '../../../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={69}
      title="Évènements du groupe"
      description="Deuil, anniversaire, naissance... cagnottes ponctuelles pour un membre bénéficiaire."
    />
  );
}
