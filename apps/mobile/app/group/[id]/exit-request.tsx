import React from 'react';
import { ScreenPlaceholder } from '../../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={75}
      title="Quitter le groupe"
      description="Demande de sortie volontaire, soumise à validation admin."
    />
  );
}
