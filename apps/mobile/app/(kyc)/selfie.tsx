import React from 'react';
import { ScreenPlaceholder } from '../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={11}
      title="Selfie"
      description="Capture du selfie de vérification."
    />
  );
}
