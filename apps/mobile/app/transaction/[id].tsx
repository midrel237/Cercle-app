import React from 'react';
import { ScreenPlaceholder } from '../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={57}
      title="Détail de la transaction"
      description="Détails d'un mouvement du ledger."
    />
  );
}
