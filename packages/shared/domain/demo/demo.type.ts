import { z } from 'zod';

export const DEMO_USAGE_REASONS = [
	'GUEST_LIMIT',
	'GLOBAL_LIMIT',
	'PROVIDER_QUOTA',
	'PROVIDER_RATE_LIMIT',
	'PROVIDER_TIMEOUT',
	'PROVIDER_ERROR',
	'LIVE_GENERATION_DISABLED',
] as const;

export const demoUsageReasonSchema = z.enum(DEMO_USAGE_REASONS);
export const demoGenerationModeSchema = z.enum(['live', 'fallback']);
const demoCounterSchema = z.object({
	used: z.number().int().nonnegative(),
	limit: z.number().int().nonnegative(),
	remaining: z.number().int().nonnegative(),
});
export const demoUsageStatusSchema = z
	.object({
		chat: demoCounterSchema,
		report: demoCounterSchema,
		liveGenerationEnabled: z.boolean(),
		mode: demoGenerationModeSchema,
		reason: demoUsageReasonSchema.optional(),
	})
	.strict();

export type DemoUsageReason = z.infer<typeof demoUsageReasonSchema>;
export type DemoGenerationMode = z.infer<typeof demoGenerationModeSchema>;
export type DemoUsageStatus = z.infer<typeof demoUsageStatusSchema>;
