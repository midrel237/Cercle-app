import { create } from 'zustand';
import type { User } from '@tontine/shared';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  /**
   * Numéro de téléphone (indicatif inclus) du compte connecté.
   * Mémorisé dès la vérification OTP (écran 5) car il reste requis par
   * POST /auth/pin/create à l'onboarding (écran 17), longtemps après que
   * les paramètres de navigation de l'écran OTP ont disparu.
   */
  phoneNumber: string | null;
  setUser: (user: User | null) => void;
  setPhoneNumber: (phoneNumber: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  phoneNumber: null,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setPhoneNumber: (phoneNumber) => set({ phoneNumber }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));
