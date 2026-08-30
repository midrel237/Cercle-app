import { create } from 'zustand';

export type KycDocumentType = 'carte_identite' | 'passeport' | 'permis_conduire';

interface KycState {
  documentType: KycDocumentType;
  dataProcessingAccepted: boolean;
  setDocumentType: (type: KycDocumentType) => void;
  setDataProcessingAccepted: (accepted: boolean) => void;
}

// Fait circuler les choix de l'utilisateur entre les écrans du parcours
// KYC (intro → choix du document → capture recto/verso → selfie → revue),
// jusqu'à l'appel final POST /users/me/kyc une fois les photos capturées.
export const useKycStore = create<KycState>((set) => ({
  documentType: 'carte_identite',
  dataProcessingAccepted: true, // pré-coché, comme sur la maquette (écran 6)
  setDocumentType: (documentType) => set({ documentType }),
  setDataProcessingAccepted: (dataProcessingAccepted) => set({ dataProcessingAccepted }),
}));
