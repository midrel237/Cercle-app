import React from 'react';
import { Tabs } from 'expo-router';
import { colors } from '../../src/theme';

/**
 * Barre d'onglets principale (après connexion + onboarding complet).
 * Regroupe les écrans 22 (Accueil), 46 (Prêts), 56 (Historique), 61 (Profil).
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.navyDark,
        tabBarInactiveTintColor: colors.navySoft,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Accueil' }} />
      <Tabs.Screen name="loans" options={{ title: 'Prêts' }} />
      <Tabs.Screen name="history" options={{ title: 'Historique' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
