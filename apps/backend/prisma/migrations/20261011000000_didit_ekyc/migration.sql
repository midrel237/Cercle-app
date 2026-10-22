-- Didit eKYC: nouvelles colonnes sur kyc_documents
-- Schema source: apps/backend/prisma/schema.prisma (model KycDocument)
--   diditSessionId  String?   @unique @map("didit_session_id")
--   diditDecision   String?   @map("didit_decision")
--   verifiedAt      DateTime? @map("verified_at")
ALTER TABLE "kyc_documents" ADD COLUMN "didit_session_id" TEXT;
ALTER TABLE "kyc_documents" ADD COLUMN "didit_decision" TEXT;
ALTER TABLE "kyc_documents" ADD COLUMN "verified_at" TIMESTAMP(3);
CREATE UNIQUE INDEX "kyc_documents_didit_session_id_key" ON "kyc_documents"("didit_session_id");
-- La capture documentaire est deleguee a Didit : champs legacy rendus optionnels.
-- Colonnes camelCase dans la base (pas de @map sur ces champs dans le schema) ;
-- les noms snake_case utilises precedemment n'existaient pas (P3018/42703).
ALTER TABLE "kyc_documents" ALTER COLUMN "documentType" DROP NOT NULL;
ALTER TABLE "kyc_documents" ALTER COLUMN "rectoUrl" DROP NOT NULL;
ALTER TABLE "kyc_documents" ALTER COLUMN "selfieUrl" DROP NOT NULL;
