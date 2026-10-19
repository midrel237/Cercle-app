import { useEffect } from 'react';
import { useRouter } from 'expo-router';

// Écrans 8-12 remplacés par le flux hébergé Didit — voir capture-recto.tsx.
export default function Screen() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/(kyc)/document-choice');
  }, [router]);
  return null;
}
