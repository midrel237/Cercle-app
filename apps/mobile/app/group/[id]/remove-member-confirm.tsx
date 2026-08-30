import React from 'react';
import { ScreenPlaceholder } from '../../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={43}
      title="Confirmer le retrait"
      description="Confirmation avant retrait d'un membre."
    />
  );
}
