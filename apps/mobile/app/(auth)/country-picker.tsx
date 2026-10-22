import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { colors } from '../../src/theme';

// Écran 79 — Choix du pays / indicatif téléphonique.
//
// OBSOLÈTE : la sélection du pays se fait désormais par la liste
// déroulante inline CountryDropdown, directement sur les écrans de
// connexion et de création de compte — plus de navigation dédiée.
// Cette route est conservée uniquement comme redirection de
// compatibilité (liens profonds, historique de navigation) : tout
// accès renvoie à l'écran de connexion.
export default function CountryPickerRedirect() {
  useEffect(() => {
    router.replace('/(auth)/login');
  }, []);

  return <View style={{ flex: 1, backgroundColor: colors.navy }} />;
}
