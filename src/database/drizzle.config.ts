import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  out: 'drizzle_output',
  schema: 'schemas.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});