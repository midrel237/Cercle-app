import { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';

// Écran 36 (carte bancaire diaspora) : intégré comme onglet de
// /payment/add-method (kind=card) — cette route reste déclarée pour la
// compatibilité deep link et redirige immédiatement.
export default function Screen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ groupId?: string }>();

  useEffect(() => {
    router.replace({
      pathname: '/payment/add-method',
      params: { kind: 'card', ...(params.groupId ? { groupId: params.groupId } : {}) },
    });
  }, [router, params.groupId]);

  return null;
}
