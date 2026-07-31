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
	PUBLIC_DEMO_MODE: booleanStringSchema.default(false),
	PUBLIC_LLM_ENABLED: booleanStringSchema.default(false),
	OPENAI_API_KEY: optionalNonEmptyStringSchema,
	OPENAI_CHAT_MODEL: z.literal('gpt-5.6-terra').default('gpt-5.6-terra'),
	OPENAI_REPORT_MODEL: z.literal('gpt-5.6-terra').default('gpt-5.6-terra'),
	OPENAI_REASONING_EFFORT: z.literal('low').default('low'),
	DEMO_CHAT_LIMIT: z.coerce.number().int().min(0).max(100).default(5),
	DEMO_REPORT_LIMIT: z.coerce.number().int().min(0).max(20).default(1),
	DEMO_CHAT_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(1).max(128_000).default(800),
	DEMO_REPORT_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(1).max(128_000).default(1_800),
	DEMO_MAX_INPUT_CHARS: z.coerce.number().int().min(1).max(10_000).default(1_200),
	DEMO_GLOBAL_DAILY_CHAT_LIMIT: z.coerce.number().int().min(0).max(100_000).default(30),
	DEMO_GLOBAL_DAILY_REPORT_LIMIT: z.coerce.number().int().min(0).max(100_000).default(6),
	DEMO_MAX_CONCURRENT_LLM_REQUESTS: z.coerce.number().int().min(1).max(100).default(2),
	DEMO_LLM_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(300_000).default(45_000),
	DEMO_REPORT_LLM_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(300_000).default(180_000),
	DEMO_GUEST_RETENTION_HOURS: z.coerce.number().int().min(1).max(720).default(24),
	DEMO_GUEST_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1_000).default(10),
	DEMO_GUEST_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().min(1).max(1_440).default(60),
	DEMO_GUEST_RATE_LIMIT_SECRET: optionalNonEmptyStringSchema,
	DEMO_TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(1),
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
