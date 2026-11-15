import { Injectable, OnModuleDestroy } from '@nestjs/common';
import postgres from 'postgres';
import {
  drizzle,
  type PostgresJsDatabase,
} from 'drizzle-orm/postgres-js';

import * as schema from './schemas.js';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly client: ReturnType<typeof postgres>;

  readonly db: PostgresJsDatabase<typeof schema>;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL no está configurado en las variables de entorno',
      );
    }

    this.client = postgres(databaseUrl, {
      prepare: false,
    });

    this.db = drizzle(this.client, {
      schema,
    });
  }

  async onModuleDestroy() {
    await this.client.end();
  }
}