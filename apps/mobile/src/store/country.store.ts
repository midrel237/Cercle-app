import { create } from 'zustand';
import { Country, DEFAULT_COUNTRY } from '../constants/countries';

interface CountryState {
  selectedCountry: Country;
  setSelectedCountry: (country: Country) => void;
}

// Permet à l'écran de sélection (79) de communiquer le pays choisi aux
// écrans de connexion (4) et de création de compte (80) sans passage de
// paramètres d'URL — évite la sérialisation d'un objet dans la navigation
// et reste cohérent avec useAuthStore déjà en place dans le projet.
export const useCountryStore = create<CountryState>((set) => ({
  selectedCountry: DEFAULT_COUNTRY,
  setSelectedCountry: (country) => set({ selectedCountry: country }),
}));
