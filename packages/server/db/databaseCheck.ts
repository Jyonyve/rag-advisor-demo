import { Pool } from 'pg';

import { getDatabaseEnv } from '../config/env.js';

const EXPECTED_PUBLIC_TABLES = [
	'characters',
	'chat_turns',
	'credentials',
	'demo_generation_usage',
	'demo_guest_attempts',
	'demo_guests',
	'documents',
	'finalization_jobs',
	'histories',
	'lores',
	'memory_embeddings',
	'profiles',
	'recaps',
	'sessions',
	'temp_chat_turns',
	'terms',
	'users',
] as const;

interface NameRow {
	table_name: string;
}

interface CountRow {
	count: string;
}

const env = getDatabaseEnv();
const pool = new Pool({
	connectionString: env.DATABASE_URL,
	max: 1,
	ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
});

try {
	const client = await pool.connect();
	try {
		await client.query('BEGIN READ ONLY');
		const vectorResult = await client.query<{ value: boolean }>(
			"SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') AS value"
		);
		const tableResult = await client.query<NameRow>(
			"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
		);
		const migrationTableResult = await client.query<{ value: boolean }>(
			"SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS value"
		);
		const publicTables = tableResult.rows.map(({ table_name }) => table_name);
		const expectedTableSet = new Set<string>(EXPECTED_PUBLIC_TABLES);
		const migrationTableExists = migrationTableResult.rows[0]?.value ?? false;
		const clientTransportEncrypted =
			(client as unknown as { connection?: { stream?: { encrypted?: boolean } } }).connection?.stream
				?.encrypted === true;
		let appliedMigrationCount = 0;
		if (migrationTableExists) {
			const migrationCountResult = await client.query<CountRow>(
				'SELECT COUNT(*)::text AS count FROM drizzle.__drizzle_migrations'
			);
			appliedMigrationCount = Number(migrationCountResult.rows[0]?.count ?? 0);
		}
		await client.query('COMMIT');
		process.stdout.write(
			`${JSON.stringify(
				{
					connected: true,
					databaseSslConfigured: env.DATABASE_SSL,
					clientTransportEncrypted,
					vectorExtensionInstalled: vectorResult.rows[0]?.value ?? false,
					migrationTableExists,
					appliedMigrationCount,
					publicTableCount: publicTables.length,
					expectedTableCount: EXPECTED_PUBLIC_TABLES.length,
					missingExpectedTables: EXPECTED_PUBLIC_TABLES.filter(
						(tableName) => !publicTables.includes(tableName)
					),
					unexpectedPublicTables: publicTables.filter((tableName) => !expectedTableSet.has(tableName)),
				},
				null,
				2
			)}\n`
		);
	} catch (error) {
		await client.query('ROLLBACK').catch(() => undefined);
		throw error;
	} finally {
		client.release();
	}
} finally {
	await pool.end();
}
