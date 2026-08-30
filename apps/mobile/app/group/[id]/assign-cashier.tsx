import React from 'react';
import { ScreenPlaceholder } from '../../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={67}
      title="Désigner le caissier (admin)"
      description="Choix du membre responsable de la collecte et du reversement des cotisations."
    />
  );
}
