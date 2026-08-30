import React from 'react';
import { ScreenPlaceholder } from '../../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={76}
      title="Demande de sortie envoyée"
      description="Statut de la demande de sortie en attente de validation."
    />
  );
}
