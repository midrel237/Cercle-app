import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Prisma ORM 7 : l'URL de connexion utilisée par le CLI (migrate, generate,
// studio) ne se configure plus dans schema.prisma mais ici. Le client
// applicatif (PrismaService) a lui besoin de son propre adaptateur —
// voir src/database/prisma.service.ts — d'où la duplication de
// DATABASE_URL entre les deux fichiers (comportement documenté de
// Prisma 7, pas une erreur : https://pris.ly/d/config-datasource).
//
// NOTE CI : `prisma generate` n'ouvre aucune connexion — il n'a besoin
// d'aucune base réelle. On fournit donc une URL de repli quand
// DATABASE_URL est absente (CI sans .env), ce qui évite le
// PrismaConfigEnvError sans toucher au comportement local (où le .env
// prime toujours). `migrate dev` exige, lui, une vraie base — le .env
// local reste obligatoire pour cette commande, comme avant.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://cercle:cercle@localhost:5432/cercle_db',
  },
});
