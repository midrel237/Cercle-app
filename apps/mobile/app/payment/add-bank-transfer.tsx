import { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';

// Écran 37 (virement bancaire diaspora) : intégré comme onglet de
// /payment/add-method (kind=bank-transfer) — cette route reste déclarée
// pour la compatibilité deep link et redirige immédiatement.
export default function Screen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ groupId?: string }>();

  useEffect(() => {
    router.replace({
      pathname: '/payment/add-method',
      params: {
        kind: 'bank-transfer',
        ...(params.groupId ? { groupId: params.groupId } : {}),
      },
    });
  }, [router, params.groupId]);

  return null;
}
