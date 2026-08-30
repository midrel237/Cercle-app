import React, { useCallback, useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Fraunces_400Regular,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
} from '@expo-google-fonts/fraunces';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
} from '@expo-google-fonts/ibm-plex-mono';
import '../src/i18n';

// Garde le splash natif visible tant que les polices ne sont pas chargées —
// l'écran "Splash" (route (auth)/splash) prend ensuite le relais avec
// l'identité visuelle Cercle (voir écran 1 de la maquette).
SplashScreen.preventAutoHideAsync();

/**
 * Layout racine. Le flux global suit le cahier des charges / la maquette :
 * (auth) -> (kyc) -> (onboarding) -> (tabs) + routes modales
 * (group, loan, payment, transaction, settings, notifications).
 */
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_400Regular,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    onLayoutRootView();
  }, [onLayoutRootView]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} initialRouteName="(auth)">
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(kyc)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="group" />
        <Stack.Screen name="loan" />
        <Stack.Screen name="payment" />
        <Stack.Screen name="transaction" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
        <Stack.Screen name="statement-export" options={{ presentation: 'modal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
