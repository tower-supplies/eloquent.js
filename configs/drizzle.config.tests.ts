import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  driver: 'expo',
  out: './tests/support/database/migrations',
  schema: './tests/support/database/schema.ts',
});
