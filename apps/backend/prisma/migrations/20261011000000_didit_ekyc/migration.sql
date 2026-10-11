-- Didit eKYC: nouvelles colonnes sur KycDocument
-- Schema source: apps/backend/prisma/schema.prisma (model KycDocument)
--   diditSessionId  String?   @map("didit_session_id")
--   diditDecision   String?   @map("didit_decision")
--   verifiedAt      DateTime? @map("verified_at")
ALTER TABLE "KycDocument" ADD COLUMN "didit_session_id" TEXT;
ALTER TABLE "KycDocument" ADD COLUMN "didit_decision" TEXT;
ALTER TABLE "KycDocument" ADD COLUMN "verified_at" TIMESTAMP(3);
CREATE UNIQUE INDEX "KycDocument_didit_session_id_key" ON "KycDocument"("didit_session_id");
