import React from 'react';
import { ScreenPlaceholder } from '../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={55}
      title="Remboursement confirmé"
      description="Échéance réglée avec succès."
    />
  );
}
