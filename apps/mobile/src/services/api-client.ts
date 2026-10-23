import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'cercle_access_token';
const PHONE_NUMBER_KEY = 'cercle_phone_number';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function setStoredAccessToken(token: string) {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

export async function clearStoredAccessToken() {
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}

/**
 * Token JWT d'accès courant — utilisé pour construire les liens ouvrables
 * hors de l'app (relevé PDF via expo-web-browser, qui ne peut pas poser
 * de header Authorization).
 */
export async function getStoredAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

/**
 * Numéro de téléphone (E.164) du dernier compte utilisé sur cet appareil.
 * Persisté en SecureStore car le store zustand est en mémoire : le login
 * PIN-first (POST /auth/login) en a besoin à chaque ouverture, même après
 * un redémarrage ou une déconnexion (le PIN reste défini sur le compte).
 * Seul l'effacement complet de l'app (ou une suppression de compte) le
 * retire — la déconnexion volontaire le conserve pour permettre la
 * reconnexion par PIN.
 */
export async function setStoredPhoneNumber(phoneNumber: string) {
  await SecureStore.setItemAsync(PHONE_NUMBER_KEY, phoneNumber);
}

export async function getStoredPhoneNumber(): Promise<string | null> {
  return SecureStore.getItemAsync(PHONE_NUMBER_KEY);
}

export async function clearStoredPhoneNumber() {
  await SecureStore.deleteItemAsync(PHONE_NUMBER_KEY);
}
