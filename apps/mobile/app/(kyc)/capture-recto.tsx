import { useEffect } from 'react';
import { useRouter } from 'expo-router';

// Écrans 8-12 remplacés par le flux hébergé Didit : la capture des pièces
// (recto/verso, selfie, revue, infos) est gérée par notre partenaire.
// Ces routes restent déclarées pour compatibilité deep link / navigation
// résiduelle mais redirigent immédiatement vers l'entrée du flux Didit.
export default function Screen() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/(kyc)/document-choice');
  }, [router]);
  return null;
}
