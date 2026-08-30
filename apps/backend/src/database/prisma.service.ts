import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Enveloppe autour du client Prisma. Point d'accès unique à PostgreSQL,
 * y compris au ledger central des transactions financières.
 *
 * Prisma ORM 7 a retiré son moteur de requêtes Rust au profit de
 * node-postgres : le client doit donc recevoir un "driver adapter"
 * explicite plutôt que de lire DATABASE_URL implicitement (cf.
 * prisma.config.ts pour la configuration équivalente côté CLI).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
