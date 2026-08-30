import React from 'react';
import { ScreenPlaceholder } from '../../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={23}
      title="Créer un groupe (1/3)"
      description="Nom et mode du groupe."
    />
  );
}
