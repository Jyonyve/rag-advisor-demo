import { randomUUID } from 'node:crypto';
import { and, count, eq, gte, inArray, lt, or, sql } from 'drizzle-orm';
import type { DemoUsageReason, DemoUsageStatus } from '@rag-advisor-demo/shared/domain';
import { getServerEnv } from '../config/env.js';
import { getDatabase } from '../db/postgresClient.js';
import { demoGenerationUsage, demoGuests } from '../db/schema.js';

export type DemoGenerationKind = 'chat' | 'report';
export const COUNTED_DEMO_GENERATION_STATUSES = ['reserved', 'succeeded', 'failed'] as const;
type DemoReservationTimeouts = { chatMs: number; reportMs: number };
type ReservationResult =
	| { allowed: true; usageId: string }
	| { allowed: false; reason: DemoUsageReason };

export const evaluateDemoReservation = (input: {
	guestActive: number;
	globalActive: number;
	concurrentActive: number;
	guestLimit: number;
	globalLimit: number;
	concurrentLimit: number;
}): DemoUsageReason | undefined => {
	if (input.guestActive >= input.guestLimit) return 'GUEST_LIMIT';
	if (input.globalActive >= input.globalLimit) return 'GLOBAL_LIMIT';
	if (input.concurrentActive >= input.concurrentLimit) return 'GLOBAL_LIMIT';
	return undefined;
};

const utcDay = (date = new Date()): string => date.toISOString().slice(0, 10);

export const resolveDemoReservationStaleBefore = (
	kind: DemoGenerationKind,
	now: Date,
	timeouts: DemoReservationTimeouts
): string => {
	const timeoutMs = kind === 'chat' ? timeouts.chatMs : timeouts.reportMs;
	return new Date(now.getTime() - timeoutMs * 2).toISOString();
};

const limitsFor = (kind: DemoGenerationKind) => {
	const env = getServerEnv();
	return kind === 'chat'
		? { guest: env.DEMO_CHAT_LIMIT, global: env.DEMO_GLOBAL_DAILY_CHAT_LIMIT }
		: { guest: env.DEMO_REPORT_LIMIT, global: env.DEMO_GLOBAL_DAILY_REPORT_LIMIT };
};

const attemptCount = async (userId: string, kind: DemoGenerationKind) => {
	const [row] = await getDatabase()
		.select({ value: count() })
		.from(demoGenerationUsage)
		.where(
			and(
				eq(demoGenerationUsage.userId, userId),
				eq(demoGenerationUsage.kind, kind),
				inArray(demoGenerationUsage.status, [...COUNTED_DEMO_GENERATION_STATUSES])
			)
		);
	return row?.value ?? 0;
};

export const isDemoGuest = async (userId: string): Promise<boolean> => {
	const [row] = await getDatabase()
		.select({ userId: demoGuests.userId })
		.from(demoGuests)
		.where(eq(demoGuests.userId, userId))
		.limit(1);
	return Boolean(row);
};

export const resolveDemoUsageAvailability = (
	publicLlmEnabled: boolean,
	hasOpenAiKey: boolean,
	mode?: DemoUsageStatus['mode'],
	reason?: DemoUsageReason
): Pick<DemoUsageStatus, 'liveGenerationEnabled' | 'mode' | 'reason'> => {
	const liveGenerationEnabled = publicLlmEnabled && hasOpenAiKey;
	const resolvedReason = reason ?? (!liveGenerationEnabled ? 'LIVE_GENERATION_DISABLED' : undefined);
	return {
		liveGenerationEnabled,
		mode: mode ?? (liveGenerationEnabled ? 'live' : 'fallback'),
		...(resolvedReason ? { reason: resolvedReason } : {}),
	};
};

export const getDemoUsageStatus = async (
	userId: string,
	mode?: DemoUsageStatus['mode'],
	reason?: DemoUsageReason
): Promise<DemoUsageStatus> => {
	const env = getServerEnv();
	const [chatUsed, reportUsed] = await Promise.all([
		attemptCount(userId, 'chat'),
		attemptCount(userId, 'report'),
	]);
	return {
		chat: {
			used: chatUsed,
			limit: env.DEMO_CHAT_LIMIT,
			remaining: Math.max(0, env.DEMO_CHAT_LIMIT - chatUsed),
		},
		report: {
			used: reportUsed,
			limit: env.DEMO_REPORT_LIMIT,
			remaining: Math.max(0, env.DEMO_REPORT_LIMIT - reportUsed),
		},
		...resolveDemoUsageAvailability(
			env.PUBLIC_LLM_ENABLED,
			Boolean(env.OPENAI_API_KEY),
			mode,
			reason
		),
	};
};

export const reserveDemoGeneration = async (
	userId: string,
	kind: DemoGenerationKind,
	now = new Date()
): Promise<ReservationResult> => {
	const env = getServerEnv();
	if (!env.PUBLIC_LLM_ENABLED || !env.OPENAI_API_KEY) {
		return { allowed: false, reason: 'LIVE_GENERATION_DISABLED' };
	}
	const limits = limitsFor(kind);
	const day = utcDay(now);
	const timeouts = { chatMs: env.DEMO_LLM_TIMEOUT_MS, reportMs: env.DEMO_REPORT_LLM_TIMEOUT_MS };
	const chatStaleBefore = resolveDemoReservationStaleBefore('chat', now, timeouts);
	const reportStaleBefore = resolveDemoReservationStaleBefore('report', now, timeouts);
	const timestamp = now.toISOString();

	return getDatabase().transaction(async (tx) => {
		await tx.execute(sql`select pg_advisory_xact_lock(168410911)`);
		await tx
			.update(demoGenerationUsage)
			.set({ status: 'failed', updatedAt: timestamp })
			.where(
				and(
					eq(demoGenerationUsage.status, 'reserved'),
					or(
						and(eq(demoGenerationUsage.kind, 'chat'), lt(demoGenerationUsage.updatedAt, chatStaleBefore)),
						and(
							eq(demoGenerationUsage.kind, 'report'),
							lt(demoGenerationUsage.updatedAt, reportStaleBefore)
						)
					)
				)
			);

		const countedStatuses = [...COUNTED_DEMO_GENERATION_STATUSES];
		const [[guest], [global], [concurrent]] = await Promise.all([
			tx
				.select({ value: count() })
				.from(demoGenerationUsage)
				.where(
					and(
						eq(demoGenerationUsage.userId, userId),
						eq(demoGenerationUsage.kind, kind),
						inArray(demoGenerationUsage.status, countedStatuses)
					)
				),
			tx
				.select({ value: count() })
				.from(demoGenerationUsage)
				.where(
					and(
						eq(demoGenerationUsage.usageDay, day),
						eq(demoGenerationUsage.kind, kind),
						inArray(demoGenerationUsage.status, countedStatuses)
					)
				),
			tx
				.select({ value: count() })
				.from(demoGenerationUsage)
				.where(
					and(
						eq(demoGenerationUsage.status, 'reserved'),
						or(
							and(
								eq(demoGenerationUsage.kind, 'chat'),
								gte(demoGenerationUsage.updatedAt, chatStaleBefore)
							),
							and(
								eq(demoGenerationUsage.kind, 'report'),
								gte(demoGenerationUsage.updatedAt, reportStaleBefore)
							)
						)
					)
				),
		]);
		const denial = evaluateDemoReservation({
			guestActive: guest?.value ?? 0,
			globalActive: global?.value ?? 0,
			concurrentActive: concurrent?.value ?? 0,
			guestLimit: limits.guest,
			globalLimit: limits.global,
			concurrentLimit: env.DEMO_MAX_CONCURRENT_LLM_REQUESTS,
		});
		if (denial) return { allowed: false, reason: denial };

		const usageId = `demo-usage-${randomUUID()}`;
		await tx
			.insert(demoGenerationUsage)
			.values({
				usageId,
				userId,
				kind,
				status: 'reserved',
				usageDay: day,
				createdAt: timestamp,
				updatedAt: timestamp,
			});
		return { allowed: true, usageId };
	});
};

export const finishDemoGeneration = async (
	usageId: string,
	status: 'succeeded' | 'failed'
): Promise<void> => {
	await getDatabase()
		.update(demoGenerationUsage)
		.set({ status, updatedAt: new Date().toISOString() })
		.where(and(eq(demoGenerationUsage.usageId, usageId), eq(demoGenerationUsage.status, 'reserved')));
};

export const classifyDemoProviderError = (error: unknown): DemoUsageReason => {
	const record = error as
		| { status?: number; code?: string; name?: string; demoReason?: DemoUsageReason }
		| undefined;
	if (record?.demoReason) return record.demoReason;
	if (record?.name === 'AbortError' || record?.code === 'ETIMEDOUT') return 'PROVIDER_TIMEOUT';
	if (record?.status === 429)
		return record.code === 'insufficient_quota' ? 'PROVIDER_QUOTA' : 'PROVIDER_RATE_LIMIT';
	return 'PROVIDER_ERROR';
};

export const getPublicDemoModel = (kind: DemoGenerationKind) => {
	const env = getServerEnv();
	return {
		platform: 'direct' as const,
		provider: 'openai' as const,
		model: kind === 'chat' ? env.OPENAI_CHAT_MODEL : env.OPENAI_REPORT_MODEL,
		maxTokens: kind === 'chat' ? env.DEMO_CHAT_MAX_OUTPUT_TOKENS : env.DEMO_REPORT_MAX_OUTPUT_TOKENS,
	};
};
