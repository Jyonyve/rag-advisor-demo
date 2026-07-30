import supertokens from 'supertokens-node';
import { count, eq, inArray, lt } from 'drizzle-orm';
import { getDatabase } from '../db/postgresClient.js';
import {
	chatTurns,
	credentials,
	demoGenerationUsage,
	demoGuestAttempts,
	demoGuests,
	documents,
	finalizationJobs,
	histories,
	lores,
	memoryEmbeddings,
	profiles,
	recaps,
	sessions,
	tempChatTurns,
	users,
} from '../db/schema.js';

export type DemoCleanupCounts = Record<
	| 'guests'
	| 'guestAttempts'
	| 'users'
	| 'credentials'
	| 'sessions'
	| 'profiles'
	| 'tempChatTurns'
	| 'chatTurns'
	| 'lores'
	| 'histories'
	| 'recaps'
	| 'documents'
	| 'finalizationJobs'
	| 'memoryEmbeddings'
	| 'usageRows',
	number
>;

export type DemoCleanupPlan = {
	cutoff: string;
	userIds: string[];
	counts: DemoCleanupCounts;
	dryRun: boolean;
};

export const parseDemoCleanupArgs = (args: string[]) => {
	const execute = args.includes('--execute');
	const explicitDryRun = args.includes('--dry-run');
	if (execute && explicitDryRun) throw new Error('Choose either --dry-run or --execute, not both.');
	const hoursArg = args.find((arg) => arg.startsWith('--older-than-hours='));
	const spacedIndex = args.indexOf('--older-than-hours');
	const rawHours = hoursArg?.split('=')[1] ?? (spacedIndex >= 0 ? args[spacedIndex + 1] : '24');
	const hours = Number(rawHours);
	if (!Number.isInteger(hours) || hours < 1 || hours > 720) {
		throw new Error('--older-than-hours must be an integer from 1 to 720.');
	}
	return { execute, dryRun: !execute, hours };
};

const rowCount = async (table: any, column: any, values: string[]) => {
	if (!values.length) return 0;
	const [row] = await getDatabase()
		.select({ value: count() })
		.from(table)
		.where(inArray(column, values));
	return row?.value ?? 0;
};

export const planDemoCleanup = async (cutoff: Date): Promise<DemoCleanupPlan> => {
	const candidates = await getDatabase()
		.select({ userId: demoGuests.userId })
		.from(demoGuests)
		.where(lt(demoGuests.createdAt, cutoff.toISOString()));
	const userIds = candidates.map(({ userId }) => userId).sort();
	const [attemptRow] = await getDatabase()
		.select({ value: count() })
		.from(demoGuestAttempts)
		.where(lt(demoGuestAttempts.createdAt, cutoff.toISOString()));
	const sessionRows = userIds.length
		? await getDatabase()
				.select({ sessionId: sessions.sessionId })
				.from(sessions)
				.where(inArray(sessions.userId, userIds))
		: [];
	const sessionIds = sessionRows.map(({ sessionId }) => sessionId);
	const [
		userCount,
		credentialCount,
		sessionCount,
		profileCount,
		tempCount,
		chatCount,
		loreCount,
		historyCount,
		recapCount,
		documentCount,
		jobCount,
		embeddingCount,
		usageCount,
	] = await Promise.all([
		rowCount(users, users.userId, userIds),
		rowCount(credentials, credentials.userId, userIds),
		rowCount(sessions, sessions.userId, userIds),
		rowCount(profiles, profiles.userId, userIds),
		rowCount(tempChatTurns, tempChatTurns.userId, userIds),
		rowCount(chatTurns, chatTurns.userId, userIds),
		rowCount(lores, lores.userId, userIds),
		rowCount(histories, histories.userId, userIds),
		rowCount(recaps, recaps.userId, userIds),
		rowCount(documents, documents.userId, userIds),
		rowCount(finalizationJobs, finalizationJobs.sessionId, sessionIds),
		rowCount(memoryEmbeddings, memoryEmbeddings.userId, userIds),
		rowCount(demoGenerationUsage, demoGenerationUsage.userId, userIds),
	]);
	return {
		cutoff: cutoff.toISOString(),
		userIds,
		dryRun: true,
		counts: {
			guests: userIds.length,
			guestAttempts: attemptRow?.value ?? 0,
			users: userCount,
			credentials: credentialCount,
			sessions: sessionCount,
			profiles: profileCount,
			tempChatTurns: tempCount,
			chatTurns: chatCount,
			lores: loreCount,
			histories: historyCount,
			recaps: recapCount,
			documents: documentCount,
			finalizationJobs: jobCount,
			memoryEmbeddings: embeddingCount,
			usageRows: usageCount,
		},
	};
};

export type DemoAuthDeleter = (userId: string) => Promise<void>;

export const executeDemoCleanup = async (
	plan: DemoCleanupPlan,
	deleteAuthUser: DemoAuthDeleter = async (userId) => {
		await supertokens.deleteUser(userId, true);
	}
): Promise<DemoCleanupPlan> => {
	for (const userId of plan.userIds) await deleteAuthUser(userId);
	await getDatabase().transaction(async (tx) => {
		await tx.delete(demoGuestAttempts).where(lt(demoGuestAttempts.createdAt, plan.cutoff));
		const sessionRows = await tx
			.select({ sessionId: sessions.sessionId })
			.from(sessions)
			.where(inArray(sessions.userId, plan.userIds));
		const sessionIds = sessionRows.map(({ sessionId }) => sessionId);
		if (sessionIds.length) {
			await tx.delete(finalizationJobs).where(inArray(finalizationJobs.sessionId, sessionIds));
		}
		await tx.delete(memoryEmbeddings).where(inArray(memoryEmbeddings.userId, plan.userIds));
		await tx.delete(lores).where(inArray(lores.userId, plan.userIds));
		await tx.delete(histories).where(inArray(histories.userId, plan.userIds));
		await tx.delete(users).where(inArray(users.userId, plan.userIds));
	});
	return { ...plan, dryRun: false };
};
