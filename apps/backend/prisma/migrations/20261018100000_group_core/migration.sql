-- Phase 2 — Cœur du groupe (écrans 31 + 41)
-- Schema source: apps/backend/prisma/schema.prisma
--   model GroupMessage (discussion du groupe, écran 41)
--   LedgerTransaction.cycleId (statut de cotisation par cycle, écran 31)

-- CreateTable (GroupMessage)
CREATE TABLE "group_messages" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_messages_groupId_createdAt_idx" ON "group_messages"("groupId", "createdAt");

-- Liaison cotisation ↔ cycle : nullable, aucune transaction existante
-- n'est impactée (frais, règlements de sortie… restent sans cycle).
ALTER TABLE "ledger_transactions" ADD COLUMN "cycleId" TEXT;
CREATE INDEX "ledger_transactions_cycleId_idx" ON "ledger_transactions"("cycleId");

-- Clé étrangère vers cycles (non cascade : le ledger est immuable).
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_cycleId_fkey"
  FOREIGN KEY ("cycleId") REFERENCES "cycles"("id");
