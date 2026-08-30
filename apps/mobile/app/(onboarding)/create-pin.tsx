import React from 'react';
import { ScreenPlaceholder } from '../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={16}
      title="Créer un code PIN"
      description="Définition du code de sécurité."
    />
  );
}
