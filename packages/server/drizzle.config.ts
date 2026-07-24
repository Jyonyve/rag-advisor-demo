import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './db/schema.ts',
	out: './db/migrations',
	dialect: 'postgresql',
	dbCredentials: {
		url: process.env.DATABASE_URL || 'postgresql://advisor:advisor@localhost:5432/rag_advisor_demo',
	},
	strict: true,
	verbose: true,
});
