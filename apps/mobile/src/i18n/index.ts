import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './locales/fr.json';
import en from './locales/en.json';
import frGroupSettings from './locales/group-settings.fr.json';
import enGroupSettings from './locales/group-settings.en.json';

/**
 * Fusion profonde simple (objets uniquement) : les namespaces
 * complémentaires (group-settings.*.json) s'ajoutent aux bundles
 * principaux sans écraser les clés existantes.
 */
function deepMerge<T>(base: T, extra: unknown): T {
  if (typeof base !== 'object' || base === null || Array.isArray(base)) {
    return (extra as T) ?? base;
  }
  if (typeof extra !== 'object' || extra === null || Array.isArray(extra)) {
    return base;
  }
  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(extra as Record<string, unknown>)) {
    const current = result[key];
    result[key] =
      typeof current === 'object' && current !== null && !Array.isArray(current)
        ? deepMerge(current, value)
        : value;
  }
  return result as T;
}

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: deepMerge(fr, frGroupSettings) },
    en: { translation: deepMerge(en, enGroupSettings) },
  },
  lng: 'fr', // Français par défaut (Cameroun), Anglais disponible dès le départ
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
});

export default i18n;
