import React from 'react';
import { Tabs } from 'expo-router';
import { TabBarIcon } from '../../src/components/TabBarIcon';
import { colors, fonts, spacing } from '../../src/theme';

/**
 * Barre d'onglets principale (après connexion + onboarding complet).
 * Regroupe les écrans 22 (Accueil), 46 (Prêts), 56 (Historique), 61 (Profil).
 *
 * Correctif : les emojis (🏠 💳 📊 👤) utilisés en icônes se rendaient mal
 * sur certains appareils Android (rectangle compressé). Remplacés par des
 * icônes SVG stroke cohérentes avec le reste de l'identité (DocumentIcon,
 * RotationMotif).
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.navyDark,
        tabBarInactiveTintColor: colors.navySoft,
        tabBarStyle: {
          backgroundColor: colors.creamLight,
          borderTopColor: colors.sand,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.inter.medium,
          fontSize: 10.5,
        },
        tabBarIconStyle: {
          marginTop: spacing.xs,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="loans"
        options={{
          title: 'Prêts',
          tabBarIcon: ({ color }) => <TabBarIcon name="loans" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historique',
          tabBarIcon: ({ color }) => <TabBarIcon name="history" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <TabBarIcon name="profile" color={color} />,
        }}
      />
    </Tabs>
  );
}
