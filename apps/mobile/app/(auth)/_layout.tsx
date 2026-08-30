import { Stack } from 'expo-router';

// Sans initialRouteName explicite (et en l'absence d'un index.tsx), Expo
// Router ne garantit pas de démarrer sur le premier écran voulu — il peut
// choisir n'importe quel écran du dossier selon l'ordre de découverte des
// fichiers par Metro. On fixe donc explicitement le point d'entrée du
// parcours d'authentification sur "splash" (écran 1 de la maquette), et on
// déclare l'ordre logique des écrans suivants pour plus de robustesse.
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="splash">
      <Stack.Screen name="splash" />
      <Stack.Screen name="language" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="create-account" />
      <Stack.Screen name="country-picker" options={{ presentation: 'modal' }} />
      <Stack.Screen name="otp" />
    </Stack>
  );
}
