import React from 'react';
import { ScreenPlaceholder } from '../../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={30}
      title="Résultat du tirage"
      description="Ordre de passage attribué."
    />
  );
}
