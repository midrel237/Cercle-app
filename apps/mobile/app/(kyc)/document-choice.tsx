import React from 'react';
import { ScreenPlaceholder } from '../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={7}
      title="Choix du document"
      description="Carte d'identité, passeport, etc."
    />
  );
}
