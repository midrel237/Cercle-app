import React from 'react';
import { ScreenPlaceholder } from '../../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={40}
      title="Membres (admin)"
      description="Gestion des membres du groupe."
    />
  );
}
