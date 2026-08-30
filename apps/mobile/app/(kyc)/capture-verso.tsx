import React from 'react';
import { ScreenPlaceholder } from '../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={9}
      title="Capture verso"
      description="Photo du verso de la pièce d'identité."
    />
  );
}
