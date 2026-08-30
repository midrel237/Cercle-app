import { Stack } from 'expo-router';

// Même correctif que (auth)/_layout.tsx et (kyc)/_layout.tsx — voir
// docs/screens-map.md pour l'ordre de référence (écrans 16-20).
export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="create-pin">
      <Stack.Screen name="create-pin" />
      <Stack.Screen name="pin-confirm" />
      <Stack.Screen name="biometric-setup" />
      <Stack.Screen name="notification-permission" />
      <Stack.Screen name="security" />
    </Stack>
  );
}
