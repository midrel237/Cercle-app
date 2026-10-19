import { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';

// Écran 62 (signature électronique) : intégré dans /loan/[id]/contract
// (case d'acceptation + signature PIN). Cette route reste déclarée pour la
// compatibilité deep link et redirige immédiatement.
export default function Screen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; loanId?: string }>();

  useEffect(() => {
    const loanId = params.id ?? params.loanId;
    if (loanId) {
      router.replace(`/loan/${loanId}/contract`);
    } else {
      router.replace('/(tabs)/loans');
    }
  }, [router, params.id, params.loanId]);

  return null;
}
