import { Stack } from 'expo-router';

// Même correctif que (auth)/_layout.tsx : sans initialRouteName explicite,
// Expo Router peut démarrer sur n'importe quel écran du dossier plutôt que
// sur "intro" — voir docs/screens-map.md pour l'ordre de référence (écrans 6-15).
export default function KycLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="intro">
      <Stack.Screen name="intro" />
      <Stack.Screen name="document-choice" />
      <Stack.Screen name="capture-recto" />
      <Stack.Screen name="capture-verso" />
      <Stack.Screen name="review-docs" />
      <Stack.Screen name="selfie" />
      <Stack.Screen name="infos" />
      <Stack.Screen name="processing" />
      <Stack.Screen name="success" />
      <Stack.Screen name="rejected" />
    </Stack>
  );
}
