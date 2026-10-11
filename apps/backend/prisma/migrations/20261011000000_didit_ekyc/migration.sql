-- Didit eKYC: nouvelles colonnes sur kyc_documents
-- Schema source: apps/backend/prisma/schema.prisma (model KycDocument)
--   diditSessionId  String?   @unique @map("didit_session_id")
--   diditDecision   String?   @map("didit_decision")
--   verifiedAt      DateTime? @map("verified_at")
ALTER TABLE "kyc_documents" ADD COLUMN "didit_session_id" TEXT;
ALTER TABLE "kyc_documents" ADD COLUMN "didit_decision" TEXT;
ALTER TABLE "kyc_documents" ADD COLUMN "verified_at" TIMESTAMP(3);
CREATE UNIQUE INDEX "kyc_documents_didit_session_id_key" ON "kyc_documents"("didit_session_id");
-- La capture documentaire est déléguée à Didit : champs legacy rendus optionnels
ALTER TABLE "kyc_documents" ALTER COLUMN "document_type" DROP NOT NULL;
ALTER TABLE "kyc_documents" ALTER COLUMN "recto_url" DROP NOT NULL;
ALTER TABLE "kyc_documents" ALTER COLUMN "selfie_url" DROP NOT NULL;
