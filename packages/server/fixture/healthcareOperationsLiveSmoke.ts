import { isDeepStrictEqual } from 'node:util';

import {
	DEFAULT_CHAT_MODEL,
	METADATA_TYPES,
	SELECTABLE_MODEL_INFO,
} from '@rag-advisor-demo/shared/config';
import type {
	CharacterInfo,
	ProfileInfo,
	SessionInfo,
	TempChatTurn,
} from '@rag-advisor-demo/shared/domain';
import { buildProfileId } from '@rag-advisor-demo/shared/util';
import { and, eq } from 'drizzle-orm';

import { closeDatabase, getDatabase } from '../db/postgresClient.js';
import { profiles, sessions, tempChatTurns } from '../db/schema.js';
import { characterStore } from '../store/characterStore.js';
import { parseEntriesToConversation } from '../util/chatParseUtils.js';
import { modelCatalogService } from '../service/modelCatalogService.js';
import { receiveBotResponse } from '../service/orchestrationService.js';
import {
	buildHealthcareOperationsSeedPlan,
	inspectHealthcareOperationsDatabase,
	type HealthcareOperationsSeedPlan,
} from './healthcareOperationsFixtureSeed.js';

export const HEALTHCARE_LIVE_SMOKE_SESSION_ID = 'healthcare-operations-assistant_demo_live-smoke';
export const HEALTHCARE_LIVE_SMOKE_REQUEST =
	'For this fictional demo, as patient support, explain the routine billing inquiry workflow and cite the eligible operational evidence.';
const HEALTHCARE_CHARACTER_ID = 'healthcare-operations-assistant_demo';
const SEQUENCE = 1;
const FIXTURE_TIMESTAMP = '2026-07-25T00:00:00.000Z';

type SmokeSnapshot = { session?: SessionInfo; profile?: ProfileInfo; tempTurn?: TempChatTurn };

type ChatChecks = {
	hasResponse: boolean;
	hasHealthcareEvidence: boolean;
	hasLoreEvidence: boolean;
	allEvidenceIsHealthcare: boolean;
	hasFictionalMarker: boolean;
	hasNotMedicalAdviceDisclaimer: boolean;
	hasLoreCitation: boolean;
};

export interface HealthcareOperationsLiveSmokePlan {
	mode: 'dry-run';
	modelName: string;
	safety: {
		databaseInspectionPerformed: true;
		databaseWritesAttempted: false;
		embeddingProviderCallsAttempted: false;
		llmProviderCallsAttempted: false;
	};
	ownerResolution: HealthcareOperationsSeedPlan['ownerResolution'];
	readiness: {
		healthcareFixturesReady: boolean;
		openAiEnvironmentKeyConfigured: boolean;
		modelSupported: boolean;
	};
	currentState: { sessionExists: boolean; profileExists: boolean; chatSmokeExists: boolean };
	verificationChecks: ChatChecks;
	plannedWrites: { sessionInsert: boolean; profileInsert: boolean; tempChatTurnInsert: boolean };
	plannedProviderCalls: {
		retrievalRuns: number;
		maximumQueryEmbeddingCalls: number;
		retrievalTransformationLlmCalls: number;
		chatGenerationLlmCalls: { minimum: number; maximum: number };
		maximumLlmCalls: number;
	};
	validationFailures: Array<{ code: string; message: string }>;
}

const materializeSession = (ownerId: string): SessionInfo => ({
	sessionId: HEALTHCARE_LIVE_SMOKE_SESSION_ID,
	userId: ownerId,
	profileId: buildProfileId(HEALTHCARE_LIVE_SMOKE_SESSION_ID, ownerId),
	characterId: HEALTHCARE_CHARACTER_ID,
	title: 'Fictional Healthcare Operations Live Smoke',
	createdAt: FIXTURE_TIMESTAMP,
	updatedAt: FIXTURE_TIMESTAMP,
	messageCount: 1,
	status: 'active',
	type: METADATA_TYPES.SESSION,
	lastCharMessage: 'Fictional Healthcare Operations live-smoke session.',
	userNote: '',
	contentPolicy: 'general',
});

const materializeProfile = (ownerId: string): ProfileInfo => ({
	profileId: buildProfileId(HEALTHCARE_LIVE_SMOKE_SESSION_ID, ownerId),
	sessionId: HEALTHCARE_LIVE_SMOKE_SESSION_ID,
	userId: ownerId,
	name: 'fictional-healthcare-operations-demo-user',
	showName: 'Fictional Operations User',
	gender: 'nocomment',
	title: 'Fictional Healthcare Operations Evaluation Profile',
	description: 'Fictional administrative session profile used only for the public RAG demo.',
	type: METADATA_TYPES.PROFILE,
	createdAt: FIXTURE_TIMESTAMP,
	updatedAt: FIXTURE_TIMESTAMP,
	domainProfile: {
		domain: 'healthcare_operations',
		workflowTopic: 'Billing inquiry',
		requesterRole: 'patient_support',
		urgency: 'routine',
		constraints: ['Fictional administrative demo scenario only.'],
	},
});

export const inspectHealthcareOperationsLiveSmoke = async (): Promise<SmokeSnapshot> => {
	const db = getDatabase();
	const [sessionRows, profileRows, tempRows] = await Promise.all([
		db
			.select({ data: sessions.data })
			.from(sessions)
			.where(eq(sessions.sessionId, HEALTHCARE_LIVE_SMOKE_SESSION_ID))
			.limit(1),
		db
			.select({ data: profiles.data })
			.from(profiles)
			.where(eq(profiles.sessionId, HEALTHCARE_LIVE_SMOKE_SESSION_ID))
			.limit(1),
		db
			.select({ data: tempChatTurns.data })
			.from(tempChatTurns)
			.where(
				and(
					eq(tempChatTurns.sessionId, HEALTHCARE_LIVE_SMOKE_SESSION_ID),
					eq(tempChatTurns.sequence, SEQUENCE)
				)
			)
			.limit(1),
	]);
	return {
		session: sessionRows[0]?.data,
		profile: profileRows[0]?.data,
		tempTurn: tempRows[0]?.data,
	};
};

const fixturesReady = (plan: HealthcareOperationsSeedPlan): boolean =>
	plan.validationFailures.length === 0 &&
	plan.stableIdCollisions.length === 0 &&
	plan.plannedOperations.characters.inserts.length === 0 &&
	plan.plannedOperations.characters.updates.length === 0 &&
	plan.plannedOperations.lores.inserts.length === 0 &&
	plan.plannedOperations.lores.updates.length === 0 &&
	plan.plannedEmbeddings.providerCallSourceIds.length === 0 &&
	plan.plannedEmbeddings.metadataRefreshSourceIds.length === 0;

const evaluateChat = (turn: TempChatTurn | undefined, ownerId: string): ChatChecks => {
	const identityMatches =
		Boolean(turn) && turn?.userId === ownerId && turn.sessionId === HEALTHCARE_LIVE_SMOKE_SESSION_ID;
	const responseText = (turn?.chatTurnSets ?? [])
		.map(({ response }) => parseEntriesToConversation(response.entries))
		.join('\n');
	const evidence = turn?.ragEvidence?.items ?? [];
	return {
		hasResponse: identityMatches && Boolean(turn?.chatTurnSets.length),
		hasHealthcareEvidence: identityMatches && turn?.ragEvidence?.domain === 'healthcare_operations',
		hasLoreEvidence:
			identityMatches && evidence.some(({ sourceKind }) => sourceKind === 'character_lore'),
		allEvidenceIsHealthcare:
			identityMatches &&
			evidence.length > 0 &&
			evidence.every(({ domain }) => domain === 'healthcare_operations'),
		hasFictionalMarker: identityMatches && /fictional/i.test(responseText),
		hasNotMedicalAdviceDisclaimer: identityMatches && /not medical advice/i.test(responseText),
		hasLoreCitation: identityMatches && /\[[^\]]+_demo-lore\]/i.test(responseText),
	};
};

const allChecksPass = (checks: ChatChecks): boolean => Object.values(checks).every(Boolean);

export const buildHealthcareOperationsLiveSmokePlan = (
	seedPlan: HealthcareOperationsSeedPlan,
	snapshot: SmokeSnapshot,
	ownerId: string | undefined,
	openAiEnvironmentKeyConfigured: boolean,
	modelName = DEFAULT_CHAT_MODEL
): HealthcareOperationsLiveSmokePlan => {
	const validationFailures: HealthcareOperationsLiveSmokePlan['validationFailures'] = [];
	const expectedSession = ownerId ? materializeSession(ownerId) : undefined;
	const expectedProfile = ownerId ? materializeProfile(ownerId) : undefined;
	const healthcareFixturesReady = fixturesReady(seedPlan);
	const modelSupported = SELECTABLE_MODEL_INFO.direct.openai.includes(
		modelName as (typeof SELECTABLE_MODEL_INFO.direct.openai)[number]
	);
	const checks = evaluateChat(snapshot.tempTurn, ownerId ?? '');

	if (!ownerId) {
		validationFailures.push({
			code: 'OWNER_UNRESOLVED',
			message: 'Select one existing local user with --owner-user-id.',
		});
	}
	if (!healthcareFixturesReady) {
		validationFailures.push({
			code: 'HEALTHCARE_FIXTURES_NOT_READY',
			message: 'Healthcare Character, Lore, and embeddings must be unchanged before live smoke.',
		});
	}
	if (!openAiEnvironmentKeyConfigured) {
		validationFailures.push({
			code: 'OPENAI_ENVIRONMENT_KEY_NOT_CONFIGURED',
			message: 'Live retrieval requires the server-side OpenAI embedding credential.',
		});
	}
	if (!modelSupported) {
		validationFailures.push({
			code: 'UNSUPPORTED_SMOKE_MODEL',
			message: `The smoke model '${modelName}' must be a supported direct OpenAI chat model.`,
		});
	}
	if (
		snapshot.session &&
		expectedSession &&
		(snapshot.session.userId !== expectedSession.userId ||
			snapshot.session.characterId !== expectedSession.characterId ||
			snapshot.session.profileId !== expectedSession.profileId)
	) {
		validationFailures.push({
			code: 'SESSION_STABLE_ID_COLLISION',
			message: 'The deterministic smoke Session ID is occupied by incompatible data.',
		});
	}
	if (
		snapshot.profile &&
		expectedProfile &&
		(snapshot.profile.userId !== expectedProfile.userId ||
			snapshot.profile.sessionId !== expectedProfile.sessionId ||
			!isDeepStrictEqual(snapshot.profile.domainProfile, expectedProfile.domainProfile))
	) {
		validationFailures.push({
			code: 'PROFILE_STABLE_ID_COLLISION',
			message: 'The deterministic smoke Profile is incompatible with the canonical demo profile.',
		});
	}
	if (snapshot.tempTurn && ownerId && !allChecksPass(checks)) {
		validationFailures.push({
			code: 'CHAT_SMOKE_ASSERTION_FAILED',
			message:
				'The existing smoke response failed healthcare evidence, citation, or disclaimer checks.',
		});
	}

	const chatPending = !snapshot.tempTurn;
	return {
		mode: 'dry-run',
		modelName,
		safety: {
			databaseInspectionPerformed: true,
			databaseWritesAttempted: false,
			embeddingProviderCallsAttempted: false,
			llmProviderCallsAttempted: false,
		},
		ownerResolution: seedPlan.ownerResolution,
		readiness: { healthcareFixturesReady, openAiEnvironmentKeyConfigured, modelSupported },
		currentState: {
			sessionExists: Boolean(snapshot.session),
			profileExists: Boolean(snapshot.profile),
			chatSmokeExists: Boolean(snapshot.tempTurn),
		},
		verificationChecks: checks,
		plannedWrites: {
			sessionInsert: !snapshot.session,
			profileInsert: !snapshot.profile,
			tempChatTurnInsert: chatPending,
		},
		plannedProviderCalls: {
			retrievalRuns: Number(chatPending),
			maximumQueryEmbeddingCalls: chatPending ? 8 : 0,
			retrievalTransformationLlmCalls: chatPending ? 2 : 0,
			chatGenerationLlmCalls: { minimum: chatPending ? 1 : 0, maximum: chatPending ? 2 : 0 },
			maximumLlmCalls: chatPending ? 4 : 0,
		},
		validationFailures,
	};
};

const persistSessionAndProfile = async (ownerId: string): Promise<void> => {
	const session = materializeSession(ownerId);
	const profile = materializeProfile(ownerId);
	await getDatabase().transaction(async (tx) => {
		await tx
			.insert(sessions)
			.values({
				sessionId: session.sessionId,
				userId: session.userId,
				characterId: session.characterId,
				profileId: session.profileId,
				status: session.status,
				data: session,
				createdAt: session.createdAt,
				updatedAt: session.updatedAt,
			})
			.onConflictDoNothing();
		await tx
			.insert(profiles)
			.values({
				profileId: profile.profileId,
				sessionId: profile.sessionId,
				userId: profile.userId,
				showName: profile.showName,
				data: profile,
				createdAt: profile.createdAt,
				updatedAt: profile.updatedAt,
			})
			.onConflictDoNothing();
	});
};

const applyLiveSmoke = async (
	ownerId: string,
	modelName: string,
	snapshot: SmokeSnapshot
): Promise<void> => {
	await persistSessionAndProfile(ownerId);
	if (snapshot.tempTurn) return;
	const [characterResponse, aiModelInfo] = await Promise.all([
		characterStore.getCharacter(HEALTHCARE_CHARACTER_ID),
		modelCatalogService.resolveAiModelInfo(modelName),
	]);
	const character: CharacterInfo = characterResponse.characterInfo;
	await receiveBotResponse(
		{
			sessionId: HEALTHCARE_LIVE_SMOKE_SESSION_ID,
			sequence: SEQUENCE,
			userId: ownerId,
			inputJsonString: JSON.stringify([{ type: 'dialogue', prompt: HEALTHCARE_LIVE_SMOKE_REQUEST }]),
		},
		character,
		materializeProfile(ownerId),
		aiModelInfo,
		'[]'
	);
};

const run = async (): Promise<void> => {
	const apply = process.argv.includes('--apply');
	const ownerId = process.argv
		.find((argument) => argument.startsWith('--owner-user-id='))
		?.slice('--owner-user-id='.length)
		.trim();
	const modelName =
		process.argv
			.find((argument) => argument.startsWith('--model='))
			?.slice('--model='.length)
			.trim() || DEFAULT_CHAT_MODEL;
	const databaseSnapshot = await inspectHealthcareOperationsDatabase();
	const seedPlan = buildHealthcareOperationsSeedPlan(databaseSnapshot, ownerId);
	const snapshot = await inspectHealthcareOperationsLiveSmoke();
	const plan = buildHealthcareOperationsLiveSmokePlan(
		seedPlan,
		snapshot,
		ownerId,
		Boolean(process.env.OPENAI_EMBEDDING_API_KEY?.trim()),
		modelName
	);
	process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
	if (plan.validationFailures.length > 0) {
		process.exitCode = 1;
		return;
	}
	if (!apply) return;
	if (!ownerId) throw new Error('An explicit Healthcare Operations smoke owner is required.');

	await applyLiveSmoke(ownerId, modelName, snapshot);
	const verificationDatabase = await inspectHealthcareOperationsDatabase();
	const verificationSnapshot = await inspectHealthcareOperationsLiveSmoke();
	const verification = buildHealthcareOperationsLiveSmokePlan(
		buildHealthcareOperationsSeedPlan(verificationDatabase, ownerId),
		verificationSnapshot,
		ownerId,
		Boolean(process.env.OPENAI_EMBEDDING_API_KEY?.trim()),
		modelName
	);
	process.stdout.write(
		`${JSON.stringify(
			{
				mode: 'applied',
				databaseWritesAttempted: true,
				embeddingProviderCallsAttempted: plan.plannedProviderCalls.maximumQueryEmbeddingCalls > 0,
				llmProviderCallsAttempted: plan.plannedProviderCalls.maximumLlmCalls > 0,
				verification: {
					currentState: verification.currentState,
					verificationChecks: verification.verificationChecks,
					plannedWrites: verification.plannedWrites,
					validationFailures: verification.validationFailures,
				},
			},
			null,
			2
		)}\n`
	);
	if (verification.validationFailures.length > 0) process.exitCode = 1;
};

const isDirectExecution = process.argv[1]?.endsWith('healthcareOperationsLiveSmoke.ts');
if (isDirectExecution) {
	try {
		await run();
	} finally {
		await closeDatabase();
	}
}
