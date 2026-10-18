import React, { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';

// Écran 38 (confirmation Mobile Money sur le téléphone opérateur) : le
// parcours réel est porté par /payment/processing (polling du webhook).
// Cette route reste déclarée pour la compatibilité deep link et redirige
// vers processing avec les paramètres de transaction disponibles.
export default function Screen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    transactionId?: string;
    amount?: string;
    provider?: string;
    groupId?: string;
  }>();

  useEffect(() => {
    router.replace({
      pathname: '/payment/processing',
      params: {
        ...(params.transactionId ? { transactionId: params.transactionId } : {}),
        ...(params.amount ? { amount: params.amount } : {}),
        ...(params.provider ? { provider: params.provider } : {}),
        ...(params.groupId ? { groupId: params.groupId } : {}),
      },
    });
  }, [router, params]);

  return null;
}
