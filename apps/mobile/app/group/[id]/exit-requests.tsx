import React from 'react';
import { ScreenPlaceholder } from '../../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={77}
      title="Demandes de sortie"
      description="Liste des demandes de sortie volontaire à valider (admin)."
    />
  );
}
