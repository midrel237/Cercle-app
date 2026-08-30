import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Prisma ORM 7 : l'URL de connexion utilisée par le CLI (migrate, generate,
// studio) ne se configure plus dans schema.prisma mais ici. Le client
// applicatif (PrismaService) a lui besoin de son propre adaptateur —
// voir src/database/prisma.service.ts — d'où la duplication de
// DATABASE_URL entre les deux fichiers (comportement documenté de
// Prisma 7, pas une erreur : https://pris.ly/d/config-datasource).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
