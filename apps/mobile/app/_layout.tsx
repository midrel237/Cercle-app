import React, { useEffect, useRef, useState } from 'react';
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
import { usersApi } from '../src/services/endpoints/account';
import { useAuthStore } from '../src/store/auth.store';
import { getStoredAccessToken } from '../src/services/api-client';
import '../src/i18n';

// Garde le splash natif visible tant que les polices ne sont pas chargees :
// l'ecran "Splash" (route (auth)/splash) prend ensuite le relais avec
// l'identite visuelle Cercle (voir ecran 1 de la maquette).
SplashScreen.preventAutoHideAsync();

/**
 * Layout racine. Le flux global suit le cahier des charges / la maquette :
 * (auth) -> (kyc) -> (onboarding) -> (tabs) + routes modales
 * (settings, notifications, statement-export).
 *
 * Note : les routes group/, loan/, payment/, transaction/ n'existent qu'en
 * sous-chemins (group/join, loan/request, payment/methods, transaction/[id]...)
 * Expo Router les decouvre automatiquement, il ne faut PAS les declarer ici
 * (sinon warning "No route named ... exists in nested children").
 *
 * Restauration de session : si un token JWT est encore en SecureStore, on
 * charge le profil (GET /users/me) et on reprend directement dans (tabs) —
 * plus de re-OTP / re-KYC a chaque ouverture de l'app. Token invalide ou
 * absent → flux normal depuis (auth). L'ecran (auth)/splash n'est plus une
 * etape obligatoire : initialRouteName depend de la session.
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

  const [sessionChecked, setSessionChecked] = useState(false);
  const sessionRestored = useRef(false);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await getStoredAccessToken();
        if (!token) {
          return;
        }
        // Token present : verifier qu'il est encore valide cote backend et
        // hydrater le store (id, fullName, kycStatus). 401 = token expire
        // → flux d'auth normal (le token reste en place, inoffensif).
        const { data } = await usersApi.getProfile();
        if (data?.id) {
          setUser({
            id: data.id,
            phoneNumber: data.phoneNumber,
            fullName: data.fullName,
            language: data.language === 'FR' ? 'fr' : 'en',
            kycStatus: data.kycStatus === 'VERIFIED' ? 'verified'
              : data.kycStatus === 'PENDING' ? 'pending'
              : data.kycStatus === 'REJECTED' ? 'rejected'
              : 'not_started',
            hasBiometricEnabled: false,
            trustScore: data.trustScore,
            preferredCurrency: 'XAF',
          } as never);
          sessionRestored.current = true;
        }
      } catch {
        // Token absent/expire/reseau indisponible : flux de connexion normal.
      } finally {
        setSessionChecked(true);
      }
    };
    restoreSession();
  }, [setUser]);

  const onLayoutRootView = React.useCallback(async () => {
    if (fontsLoaded && sessionChecked) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, sessionChecked]);

  useEffect(() => {
    onLayoutRootView();
  }, [onLayoutRootView]);

  if (!fontsLoaded || !sessionChecked) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{ headerShown: false }}
        initialRouteName={sessionRestored.current ? '(tabs)' : '(auth)'}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(kyc)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
        <Stack.Screen name="statement-export" options={{ presentation: 'modal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
