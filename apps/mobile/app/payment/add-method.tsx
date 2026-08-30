import React from 'react';
import { ScreenPlaceholder } from '../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={35}
      title="Ajouter un moyen de paiement"
      description="Nouveau numéro Mobile Money."
    />
  );
}
