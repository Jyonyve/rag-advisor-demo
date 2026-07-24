import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

import type { Metadata } from '@rag-advisor-demo/shared/api';
import type { CharacterInfo, LoreInfo } from '@rag-advisor-demo/shared/domain';
import { loreToMetadata } from '@rag-advisor-demo/shared/util';
import { and, count, eq, inArray } from 'drizzle-orm';

import { closeDatabase, getDatabase } from '../db/postgresClient.js';
import { characters, lores, memoryEmbeddings, users } from '../db/schema.js';
import {
	type ReplaceMemoryEmbeddingInput,
	replaceMemoryEmbedding,
} from '../service/embeddingService.js';
import { loreToDocument } from '../util/documentUtils.js';
import {
	DEMO_CHARACTER_FIXTURES,
	DEMO_LORE_FIXTURES,
	validateBuiltInDomainFixtures,
} from './domainFixtures.js';
import { FINANCE_CATALOG_FIXTURES, FINANCE_EMBEDDING_FIXTURE_METADATA } from './financeFixtures.js';
import { DEMO_FIXTURE_DATA_VERSION } from './fixtureUtils.js';

const financeCharacterFixture = DEMO_CHARACTER_FIXTURES.find(
	({ character }) => character.domain === 'finance'
);
const financeLoreFixtures = [
	...DEMO_LORE_FIXTURES.filter(({ domain }) => domain === 'finance'),
	...FINANCE_CATALOG_FIXTURES.map(({ lore }) => lore),
];
const financeCharacterIds = financeCharacterFixture
	? [financeCharacterFixture.character.characterId]
	: [];
const financeLoreIds = financeLoreFixtures.map(({ loreId }) => loreId);

type ExistingCharacter = { characterId: string; userId: string; data: CharacterInfo };

type ExistingLore = { loreId: string; userId: string; data: LoreInfo };

type ExistingEmbedding = {
	sourceId: string;
	userId: string;
	characterId: string | null;
	contentHash: string;
	metadata: Record<string, unknown>;
	active: boolean;
};

export interface FinanceFixtureDatabaseSnapshot {
	localUserIds: string[];
	totalRecordCounts: { characters: number; lores: number; memoryEmbeddings: number };
	characters: ExistingCharacter[];
	lores: ExistingLore[];
	embeddings: ExistingEmbedding[];
}

interface FixtureActions {
	inserts: string[];
	updates: string[];
	unchanged: string[];
}

export interface FinanceFixtureSeedPlan {
	mode: 'dry-run';
	dataVersion: string;
	safety: {
		databaseInspectionPerformed: true;
		databaseWritesAttempted: false;
		embeddingProviderCallsAttempted: false;
		llmProviderCallsAttempted: false;
	};
	ownerResolution: {
		localUserCount: number;
		resolvedSingleOwner: boolean;
		explicitOwnerRequested: boolean;
	};
	databaseInspection: {
		totalRecordCounts: FinanceFixtureDatabaseSnapshot['totalRecordCounts'];
		targetRecordCounts: { characters: number; lores: number; memoryEmbeddings: number };
	};
	plannedOperations: {
		characters: FixtureActions;
		lores: FixtureActions;
		documents: FixtureActions;
	};
	plannedEmbeddings: {
		sourceIds: string[];
		providerCallSourceIds: string[];
		metadataRefreshSourceIds: string[];
		unchangedSourceIds: string[];
		maximumProviderCalls: number;
	};
	stableIdCollisions: string[];
	validationFailures: Array<{ code: string; fixtureId: string; message: string }>;
}

const hashContent = (content: string): string => createHash('sha256').update(content).digest('hex');

const materializeCharacter = (ownerId: string): CharacterInfo | undefined =>
	financeCharacterFixture ? { ...financeCharacterFixture.character, userId: ownerId } : undefined;

const materializeLores = (ownerId: string): LoreInfo[] =>
	financeLoreFixtures.map((lore) => ({ ...lore, userId: ownerId }));

const buildEmbeddingMetadata = (lore: LoreInfo): Metadata => {
	const catalogMetadata = FINANCE_EMBEDDING_FIXTURE_METADATA.find(
		({ loreFixtureId }) => loreFixtureId === lore.fixtureId
	);
	const metadata = {
		...(loreToMetadata(lore) as unknown as Metadata),
		domain: lore.domain ?? 'finance',
		fixtureId: lore.fixtureId ?? lore.loreId,
		isDemoData: lore.isDemoData === true,
		dataVersion: lore.dataVersion ?? DEMO_FIXTURE_DATA_VERSION,
		dataAsOf: lore.dataAsOf ?? '',
		knowledgeType: lore.structuredMetadata?.knowledgeType ?? 'education',
		entityKind: catalogMetadata?.entityKind ?? 'education',
		entityFixtureId: catalogMetadata?.entityFixtureId ?? lore.fixtureId ?? lore.loreId,
	};
	return Object.fromEntries(
		Object.entries(metadata).filter(([, value]) => value !== undefined)
	) as Metadata;
};

const buildEmbeddingInput = (lore: LoreInfo): ReplaceMemoryEmbeddingInput => ({
	sourceType: 'lore',
	sourceId: lore.loreId,
	contentType: 'fixture',
	userId: lore.userId,
	characterId: lore.characterIds[0],
	content: loreToDocument(lore),
	metadata: buildEmbeddingMetadata(lore),
});

const classifyFixture = <T>(
	expected: T,
	current: T | undefined,
	id: string,
	actions: FixtureActions
): void => {
	if (!current) {
		actions.inserts.push(id);
	} else if (isDeepStrictEqual(current, expected)) {
		actions.unchanged.push(id);
	} else {
		actions.updates.push(id);
	}
};

const emptyActions = (): FixtureActions => ({ inserts: [], updates: [], unchanged: [] });

export const buildFinanceFixtureSeedPlan = (
	snapshot: FinanceFixtureDatabaseSnapshot,
	requestedOwnerId?: string
): FinanceFixtureSeedPlan => {
	const localValidation = validateBuiltInDomainFixtures();
	const validationFailures: FinanceFixtureSeedPlan['validationFailures'] = [
		...localValidation.issues,
	];
	const stableIdCollisions: string[] = [];
	const characterActions = emptyActions();
	const loreActions = emptyActions();
	const documentActions = emptyActions();
	const providerCallSourceIds: string[] = [];
	const metadataRefreshSourceIds: string[] = [];
	const unchangedSourceIds: string[] = [];
	const ownerId = requestedOwnerId
		? snapshot.localUserIds.includes(requestedOwnerId)
			? requestedOwnerId
			: undefined
		: snapshot.localUserIds.length === 1
			? snapshot.localUserIds[0]
			: undefined;

	if (!ownerId) {
		validationFailures.push({
			code: requestedOwnerId
				? 'UNKNOWN_LOCAL_USER'
				: snapshot.localUserIds.length === 0
					? 'NO_LOCAL_USER'
					: 'AMBIGUOUS_LOCAL_USERS',
			fixtureId: 'finance-fixture-owner',
			message: requestedOwnerId
				? 'The explicitly selected fixture owner does not exist in the local users table.'
				: snapshot.localUserIds.length === 0
					? 'Create or synchronize the authenticated demo user before applying finance fixtures.'
					: 'Finance fixture ownership requires exactly one local demo user.',
		});
	}

	if (ownerId) {
		const expectedCharacter = materializeCharacter(ownerId);
		if (expectedCharacter) {
			const current = snapshot.characters.find(
				({ characterId }) => characterId === expectedCharacter.characterId
			);
			if (current && current.userId !== ownerId) {
				stableIdCollisions.push(expectedCharacter.characterId);
			} else {
				classifyFixture(
					expectedCharacter,
					current?.data,
					expectedCharacter.characterId,
					characterActions
				);
			}
		}

		for (const expectedLore of materializeLores(ownerId)) {
			const current = snapshot.lores.find(({ loreId }) => loreId === expectedLore.loreId);
			if (current && current.userId !== ownerId) {
				stableIdCollisions.push(expectedLore.loreId);
			} else {
				classifyFixture(expectedLore, current?.data, expectedLore.loreId, loreActions);
			}

			const expectedEmbedding = buildEmbeddingInput(expectedLore);
			const existingEmbeddings = snapshot.embeddings.filter(
				({ sourceId }) => sourceId === expectedLore.loreId
			);
			const ownershipCollision = existingEmbeddings.some(
				(embedding) =>
					embedding.userId !== ownerId || embedding.characterId !== expectedEmbedding.characterId
			);
			const activeEmbeddings = existingEmbeddings.filter(({ active }) => active);
			if (ownershipCollision || activeEmbeddings.length > 1) {
				stableIdCollisions.push(`lore-embedding:${expectedLore.loreId}`);
				continue;
			}

			const activeEmbedding = activeEmbeddings[0];
			const expectedHash = hashContent(expectedEmbedding.content);
			if (!activeEmbedding || activeEmbedding.contentHash !== expectedHash) {
				providerCallSourceIds.push(expectedLore.loreId);
			} else if (!isDeepStrictEqual(activeEmbedding.metadata, expectedEmbedding.metadata ?? {})) {
				metadataRefreshSourceIds.push(expectedLore.loreId);
			} else {
				unchangedSourceIds.push(expectedLore.loreId);
			}
		}
	}

	const uniqueCollisions = [...new Set(stableIdCollisions)].sort();
	for (const fixtureId of uniqueCollisions) {
		validationFailures.push({
			code: 'STABLE_ID_COLLISION',
			fixtureId,
			message: `Stable fixture identity '${fixtureId}' conflicts with existing database state.`,
		});
	}

	return {
		mode: 'dry-run',
		dataVersion: DEMO_FIXTURE_DATA_VERSION,
		safety: {
			databaseInspectionPerformed: true,
			databaseWritesAttempted: false,
			embeddingProviderCallsAttempted: false,
			llmProviderCallsAttempted: false,
		},
		ownerResolution: {
			localUserCount: snapshot.localUserIds.length,
			resolvedSingleOwner: Boolean(ownerId),
			explicitOwnerRequested: Boolean(requestedOwnerId),
		},
		databaseInspection: {
			totalRecordCounts: snapshot.totalRecordCounts,
			targetRecordCounts: {
				characters: snapshot.characters.length,
				lores: snapshot.lores.length,
				memoryEmbeddings: snapshot.embeddings.length,
			},
		},
		plannedOperations: {
			characters: characterActions,
			lores: loreActions,
			documents: documentActions,
		},
		plannedEmbeddings: {
			sourceIds: financeLoreIds,
			providerCallSourceIds,
			metadataRefreshSourceIds,
			unchangedSourceIds,
			maximumProviderCalls: providerCallSourceIds.length,
		},
		stableIdCollisions: uniqueCollisions,
		validationFailures,
	};
};

export const inspectFinanceFixtureDatabase = async (): Promise<FinanceFixtureDatabaseSnapshot> => {
	const db = getDatabase();
	const [localUsers, existingCharacters, existingLores, existingEmbeddings] = await Promise.all([
		db.select({ userId: users.userId }).from(users),
		financeCharacterIds.length
			? db
					.select({
						characterId: characters.characterId,
						userId: characters.userId,
						data: characters.data,
					})
					.from(characters)
					.where(inArray(characters.characterId, financeCharacterIds))
			: Promise.resolve([]),
		db
			.select({ loreId: lores.loreId, userId: lores.userId, data: lores.data })
			.from(lores)
			.where(inArray(lores.loreId, financeLoreIds)),
		db
			.select({
				sourceId: memoryEmbeddings.sourceId,
				userId: memoryEmbeddings.userId,
				characterId: memoryEmbeddings.characterId,
				contentHash: memoryEmbeddings.contentHash,
				metadata: memoryEmbeddings.metadata,
				active: memoryEmbeddings.active,
			})
			.from(memoryEmbeddings)
			.where(
				and(eq(memoryEmbeddings.sourceType, 'lore'), inArray(memoryEmbeddings.sourceId, financeLoreIds))
			),
	]);
	const [characterCounts, loreCounts, embeddingCounts] = await Promise.all([
		db.select({ value: count() }).from(characters),
		db.select({ value: count() }).from(lores),
		db.select({ value: count() }).from(memoryEmbeddings),
	]);

	return {
		localUserIds: localUsers.map(({ userId }) => userId),
		totalRecordCounts: {
			characters: characterCounts[0]?.value ?? 0,
			lores: loreCounts[0]?.value ?? 0,
			memoryEmbeddings: embeddingCounts[0]?.value ?? 0,
		},
		characters: existingCharacters,
		lores: existingLores,
		embeddings: existingEmbeddings,
	};
};

export const applyFinanceFixtureSeedPlan = async (
	plan: FinanceFixtureSeedPlan,
	snapshot: FinanceFixtureDatabaseSnapshot,
	ownerId: string
): Promise<{ providerCallsRequired: number; embeddingRecordsProcessed: number }> => {
	if (plan.validationFailures.length > 0) {
		throw new Error('Finance fixture plan has validation failures and cannot be applied.');
	}
	if (!snapshot.localUserIds.includes(ownerId)) {
		throw new Error('Finance fixture owner is unavailable.');
	}
	const character = materializeCharacter(ownerId);
	if (!character) throw new Error('Finance Character fixture is unavailable.');
	const fixtureLores = materializeLores(ownerId);
	const now = new Date().toISOString();

	await getDatabase().transaction(async (tx) => {
		const characterRows = await tx
			.insert(characters)
			.values({
				characterId: character.characterId,
				userId: ownerId,
				showName: character.showName,
				data: character,
				createdAt: character.createdAt,
				updatedAt: character.updatedAt,
			})
			.onConflictDoUpdate({
				target: characters.characterId,
				setWhere: eq(characters.userId, ownerId),
				set: { showName: character.showName, data: character, updatedAt: character.updatedAt },
			})
			.returning({ characterId: characters.characterId });
		if (characterRows.length !== 1) throw new Error('Finance Character ownership changed.');

		for (const lore of fixtureLores) {
			const loreRows = await tx
				.insert(lores)
				.values({
					loreId: lore.loreId,
					userId: ownerId,
					loreType: lore.type,
					category: lore.category,
					data: lore,
					createdAt: lore.createdAt || now,
					updatedAt: lore.updatedAt || now,
				})
				.onConflictDoUpdate({
					target: lores.loreId,
					setWhere: eq(lores.userId, ownerId),
					set: {
						loreType: lore.type,
						category: lore.category,
						data: lore,
						updatedAt: lore.updatedAt || now,
					},
				})
				.returning({ loreId: lores.loreId });
			if (loreRows.length !== 1) throw new Error(`Lore ownership changed for '${lore.loreId}'.`);
		}
	});

	const embeddingSourceIds = new Set([
		...plan.plannedEmbeddings.providerCallSourceIds,
		...plan.plannedEmbeddings.metadataRefreshSourceIds,
	]);
	for (const lore of fixtureLores) {
		if (embeddingSourceIds.has(lore.loreId)) {
			await replaceMemoryEmbedding(buildEmbeddingInput(lore));
		}
	}

	return {
		providerCallsRequired: plan.plannedEmbeddings.maximumProviderCalls,
		embeddingRecordsProcessed: embeddingSourceIds.size,
	};
};

const run = async (): Promise<void> => {
	const apply = process.argv.includes('--apply');
	const requestedOwnerId = process.argv
		.find((argument) => argument.startsWith('--owner-user-id='))
		?.slice('--owner-user-id='.length)
		.trim();
	const snapshot = await inspectFinanceFixtureDatabase();
	const plan = buildFinanceFixtureSeedPlan(snapshot, requestedOwnerId);
	process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
	if (plan.validationFailures.length > 0) {
		process.exitCode = 1;
		return;
	}
	if (!apply) return;
	if (!requestedOwnerId && snapshot.localUserIds.length !== 1) {
		throw new Error('An explicit finance fixture owner is required.');
	}
	const ownerId = requestedOwnerId ?? snapshot.localUserIds[0];
	if (!ownerId) throw new Error('Finance fixture owner is unavailable.');

	const result = await applyFinanceFixtureSeedPlan(plan, snapshot, ownerId);
	const verificationPlan = buildFinanceFixtureSeedPlan(
		await inspectFinanceFixtureDatabase(),
		ownerId
	);
	process.stdout.write(
		`${JSON.stringify(
			{
				mode: 'applied',
				dataVersion: DEMO_FIXTURE_DATA_VERSION,
				databaseWritesAttempted: true,
				embeddingProviderCallsRequired: result.providerCallsRequired,
				embeddingRecordsProcessed: result.embeddingRecordsProcessed,
				verification: {
					characters: verificationPlan.plannedOperations.characters,
					lores: verificationPlan.plannedOperations.lores,
					embeddings: verificationPlan.plannedEmbeddings,
					stableIdCollisions: verificationPlan.stableIdCollisions,
					validationFailures: verificationPlan.validationFailures,
				},
			},
			null,
			2
		)}\n`
	);
	if (
		verificationPlan.validationFailures.length > 0 ||
		verificationPlan.plannedEmbeddings.providerCallSourceIds.length > 0
	) {
		process.exitCode = 1;
	}
};

const isDirectExecution = process.argv[1]?.endsWith('financeFixtureSeed.ts');
if (isDirectExecution) {
	try {
		await run();
	} finally {
		await closeDatabase();
	}
}
