import React from 'react';
import { ScreenPlaceholder } from '../../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={42}
      title="Actions membre (admin)"
      description="Options sur un membre."
    />
  );
}
