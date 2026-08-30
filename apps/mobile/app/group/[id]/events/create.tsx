import React from 'react';
import { ScreenPlaceholder } from '../../../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={70}
      title="Créer un évènement"
      description="Type d'évènement, bénéficiaire et montant suggéré pour la cotisation des membres."
    />
  );
}
