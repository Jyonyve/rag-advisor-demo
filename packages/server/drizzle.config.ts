import { defineConfig } from 'drizzle-kit';
import { loadEnvFile } from 'node:process';

if (!process.env.DATABASE_URL) loadEnvFile('../../.env');
if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL is required for database tooling.');
}

export default defineConfig({
	schema: './db/schema.ts',
	out: './db/migrations',
	dialect: 'postgresql',
	dbCredentials: { url: process.env.DATABASE_URL },
	strict: true,
	verbose: true,
});
