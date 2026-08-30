import React from 'react';
import { ScreenPlaceholder } from '../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={22}
      title="Accueil"
      description="Liste des groupes de l'utilisateur (ou état vide, écran 21)."
    />
  );
}
