import React from 'react';
import { ScreenPlaceholder } from '../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={10}
      title="Vérification des documents"
      description="Relecture avant envoi."
    />
  );
}
