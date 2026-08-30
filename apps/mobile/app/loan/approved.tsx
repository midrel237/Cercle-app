import React from 'react';
import { ScreenPlaceholder } from '../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={49}
      title="Prêt approuvé"
      description="Le prêt a été validé par le groupe."
    />
  );
}
