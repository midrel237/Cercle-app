import React from 'react';
import { ScreenPlaceholder } from '../../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={78}
      title="Règlement de sortie"
      description="Remboursement ou solde dû lors d'une sortie volontaire."
    />
  );
}
