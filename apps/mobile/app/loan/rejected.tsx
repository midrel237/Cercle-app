import React from 'react';
import { ScreenPlaceholder } from '../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={50}
      title="Prêt refusé"
      description="Le prêt n'a pas été validé."
    />
  );
}
