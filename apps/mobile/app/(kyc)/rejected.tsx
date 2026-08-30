import React from 'react';
import { ScreenPlaceholder } from '../../src/components/ScreenPlaceholder';

export default function Screen() {
  return (
    <ScreenPlaceholder
      screenNumber={15}
      title="KYC rejeté"
      description="Document refusé, nouvelle tentative possible."
    />
  );
}
