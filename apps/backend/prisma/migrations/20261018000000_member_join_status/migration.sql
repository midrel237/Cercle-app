-- Adhésion par code : validation admin (maquette écran 28)
-- Schema source: apps/backend/prisma/schema.prisma (model GroupMember)
--   joinStatus          GroupMemberJoinStatus @default(APPROVED)
--   joinStatusChangedAt DateTime?
-- Default APPROVED : membres fondateurs et lignes existantes = admis.
CREATE TYPE "GroupMemberJoinStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
ALTER TABLE "group_members" ADD COLUMN "joinStatus" "GroupMemberJoinStatus" NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "group_members" ADD COLUMN "joinStatusChangedAt" TIMESTAMP(3);

-- Index utile au listing admin des demandes d'adhésion en attente.
CREATE INDEX "group_members_groupId_joinStatus_idx" ON "group_members"("groupId", "joinStatus");
