import React from 'react';
import { ScreenPlaceholder } from '../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={17}
      title="Confirmer le PIN"
      description="Ressaisie du code PIN."
    />
  );
}
