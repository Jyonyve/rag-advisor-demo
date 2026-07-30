import z from 'zod';

const booleanStringSchema = z.enum(['true', 'false']).transform((value) => value === 'true');

const portSchema = z.coerce.number().int().min(1).max(65535);

const optionalNonEmptyStringSchema = z.preprocess(
	(value) => (value === '' ? undefined : value),
	z.string().min(1).optional()
);

const commaSeparatedListSchema = z
	.string()
	.optional()
	.transform((value) =>
		value
			? value
					.split(',')
					.map((item) => item.trim())
					.filter(Boolean)
			: []
	);

const serverEnvSchema = z.object({
	NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
	PORT: portSchema.default(3000),
	HOST: z.string().default('0.0.0.0'),
	BASE: z.string().default('/'),
	SUPERTOKENS_CONNECTION_URI: z.string().url().default('http://localhost:3567'),
	SUPERTOKENS_API_KEY: z.string().optional(),
	VITE_APP_DOMAIN: z.string().optional(),
	VITE_API_DOMAIN: z.string().optional(),
	LOCAL_IMAGE_STORAGE_DIR: z.string().min(1).default('public/assets'),
	DASHBOARD_ADMIN_EMAILS: commaSeparatedListSchema,
	RAG_ADVISOR_RAG_TRACE: booleanStringSchema.default(false),
	PUBLIC_DEMO_ENABLED: booleanStringSchema.default(false),
	PUBLIC_DEMO_SESSION_ID: optionalNonEmptyStringSchema,
	PUBLIC_DEMO_TITLE: z.string().min(1).default('Demo conversation'),
	PUBLIC_DEMO_CHARACTER_NAME: z.string().min(1).default('Character'),
	PUBLIC_DEMO_VIEWER_NAME: z.string().min(1).default('Guest'),
	PUBLIC_DEMO_MAX_TURNS: z.coerce.number().int().min(1).max(200).default(100),
});

const embeddingEnvSchema = z.object({
	OPENAI_EMBEDDING_API_KEY: z.string().min(1, 'OPENAI_EMBEDDING_API_KEY is required for embeddings'),
	EMBEDDING_RATE_LIMIT_MAX_CALLS_PER_MINUTE: z.coerce.number().int().min(1).max(10_000).default(60),
});

const databaseEnvSchema = z.object({
	DATABASE_URL: z.string().url('DATABASE_URL must be a PostgreSQL URL'),
	DATABASE_SSL: booleanStringSchema.default(false),
	DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
});

const credentialEnvSchema = z.object({
	SECRET_ENCRYPTION_KEY: z
		.string()
		.refine((value) => Buffer.byteLength(value, 'utf8') >= 32, {
			message: 'SECRET_ENCRYPTION_KEY must be at least 32 bytes',
		}),
});

const parseEnv = <T>(schema: z.ZodSchema<T>, env: NodeJS.ProcessEnv): T => {
	const result = schema.safeParse(env);
	if (result.success) {
		return result.data;
	}

	const details = result.error.issues
		.map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
		.join('; ');
	throw new Error(`Invalid server environment: ${details}`);
};

let cachedServerEnv: z.infer<typeof serverEnvSchema> | undefined;
let cachedEmbeddingEnv: z.infer<typeof embeddingEnvSchema> | undefined;
let cachedDatabaseEnv: z.infer<typeof databaseEnvSchema> | undefined;
let cachedCredentialEnv: z.infer<typeof credentialEnvSchema> | undefined;

export const getServerEnv = () => {
	cachedServerEnv ??= parseEnv(serverEnvSchema, process.env);
	return cachedServerEnv;
};

export const getEmbeddingEnv = () => {
	cachedEmbeddingEnv ??= parseEnv(embeddingEnvSchema, process.env);
	return cachedEmbeddingEnv;
};

export const getDatabaseEnv = () => {
	cachedDatabaseEnv ??= parseEnv(databaseEnvSchema, process.env);
	return cachedDatabaseEnv;
};

export const getCredentialEnv = () => {
	cachedCredentialEnv ??= parseEnv(credentialEnvSchema, process.env);
	return cachedCredentialEnv;
};
