import React from 'react';
import { ScreenPlaceholder } from '../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={72}
      title="Ajouter une carte bancaire"
      description="Paiement diaspora par carte (tokenisé côté PSP)."
    />
  );
}
