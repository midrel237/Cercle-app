import React from 'react';
import { ScreenPlaceholder } from '../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={8}
      title="Capture recto"
      description="Photo du recto de la pièce d'identité."
    />
  );
}
