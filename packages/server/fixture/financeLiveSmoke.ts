import { isDeepStrictEqual } from 'node:util';

import {
	DEFAULT_CHAT_MODEL,
	METADATA_TYPES,
	SELECTABLE_MODEL_INFO,
} from '@rag-advisor-demo/shared/config';
import type {
	CharacterInfo,
	DocumentInfo,
	ProfileInfo,
	SessionInfo,
	TempChatTurn,
} from '@rag-advisor-demo/shared/domain';
import { buildProfileId } from '@rag-advisor-demo/shared/util';
import { and, eq } from 'drizzle-orm';

import { closeDatabase, getDatabase } from '../db/postgresClient.js';
import { documents, profiles, sessions, tempChatTurns } from '../db/schema.js';
import { parseEntriesToConversation } from '../util/chatParseUtils.js';
import { characterStore } from '../store/characterStore.js';
import { financeReportService } from '../service/financeReportService.js';
import { modelCatalogService } from '../service/modelCatalogService.js';
import { FINANCE_DEMO_NOTICE, receiveBotResponse } from '../service/orchestrationService.js';
import {
	buildFinanceFixtureSeedPlan,
	inspectFinanceFixtureDatabase,
	type FinanceFixtureSeedPlan,
} from './financeFixtureSeed.js';

export const FINANCE_LIVE_SMOKE_SESSION_ID = 'finance-assistant_demo_live-smoke';
export const FINANCE_LIVE_SMOKE_REQUEST =
	'For this fictional demo, compare products for a moderate-risk goal over 36 months with high liquidity needs. Explain material risks and cite the eligible evidence.';
const FINANCE_CHARACTER_ID = 'finance-assistant_demo';
const FINANCE_LIVE_SMOKE_SEQUENCE = 1;
const FIXTURE_TIMESTAMP = '2026-07-25T00:00:00.000Z';

type SmokeSnapshot = {
	session?: SessionInfo;
	profile?: ProfileInfo;
	tempTurn?: TempChatTurn;
	reports: DocumentInfo[];
};

type ChatSmokeChecks = {
	hasResponse: boolean;
	hasFinanceEvidence: boolean;
	hasLoreEvidence: boolean;
	allEvidenceIsFinance: boolean;
	hasFictionalMarker: boolean;
	hasNotAdviceDisclaimer: boolean;
	hasLoreCitation: boolean;
};

type ReportSmokeChecks = {
	hasGeneratedDraft: boolean;
	ragDisabledByDefault: boolean;
	hasFinancePromptVersion: boolean;
	hasLoreSources: boolean;
	hasDemoDisclaimer: boolean;
	hasNoUnsafeHtml: boolean;
};

export type FinanceLiveSmokePlan = {
	mode: 'dry-run';
	modelName: string;
	safety: {
		databaseInspectionPerformed: true;
		databaseWritesAttempted: false;
		embeddingProviderCallsAttempted: false;
		llmProviderCallsAttempted: false;
	};
	ownerResolution: FinanceFixtureSeedPlan['ownerResolution'];
	readiness: {
		financeFixturesReady: boolean;
		openAiEnvironmentKeyConfigured: boolean;
		modelSupported: boolean;
	};
	currentState: {
		sessionExists: boolean;
		profileExists: boolean;
		chatSmokeExists: boolean;
		reportSmokeCount: number;
	};
	verificationChecks: { chat: ChatSmokeChecks; report: ReportSmokeChecks };
	plannedWrites: {
		sessionInsert: boolean;
		profileInsert: boolean;
		tempChatTurnInsert: boolean;
		tempChatTurnDisclaimerUpdate: boolean;
		generatedReportInsert: boolean;
	};
	plannedProviderCalls: {
		retrievalRuns: number;
		maximumQueryEmbeddingCalls: number;
		retrievalTransformationLlmCalls: number;
		chatGenerationLlmCalls: { minimum: number; maximum: number };
		reportGenerationLlmCalls: number;
		maximumLlmCalls: number;
	};
	validationFailures: Array<{ code: string; message: string }>;
};

const materializeSession = (ownerId: string): SessionInfo => {
	const profileId = buildProfileId(FINANCE_LIVE_SMOKE_SESSION_ID, ownerId);
	return {
		sessionId: FINANCE_LIVE_SMOKE_SESSION_ID,
		userId: ownerId,
		profileId,
		characterId: FINANCE_CHARACTER_ID,
		title: 'Fictional Finance Live Smoke',
		createdAt: FIXTURE_TIMESTAMP,
		updatedAt: FIXTURE_TIMESTAMP,
		messageCount: 1,
		status: 'active',
		type: METADATA_TYPES.SESSION,
		lastCharMessage: 'Fictional finance demo live-smoke session.',
		userNote: '',
		contentPolicy: 'general',
	};
};

const materializeProfile = (ownerId: string): ProfileInfo => ({
	profileId: buildProfileId(FINANCE_LIVE_SMOKE_SESSION_ID, ownerId),
	sessionId: FINANCE_LIVE_SMOKE_SESSION_ID,
	userId: ownerId,
	name: 'fictional-finance-demo-user',
	showName: 'Fictional Demo User',
	gender: 'nocomment',
	title: 'Fictional Finance Evaluation Profile',
	description: 'Fictional session profile used only for the public finance RAG demo.',
	type: METADATA_TYPES.PROFILE,
	createdAt: FIXTURE_TIMESTAMP,
	updatedAt: FIXTURE_TIMESTAMP,
	domainProfile: {
		domain: 'finance',
		investmentGoal: 'Compare fictional reserve and medium-term savings products.',
		investmentHorizonMonths: 36,
		liquidityNeed: 'high',
		riskPreference: 'moderate',
		constraints: ['Fictional demo scenario only.'],
	},
});

const isSmokeReport = (document: DocumentInfo): boolean =>
	document.documentKind === 'personalized-finance-report' &&
	document.requestText === FINANCE_LIVE_SMOKE_REQUEST;

export const inspectFinanceLiveSmoke = async (): Promise<SmokeSnapshot> => {
	const db = getDatabase();
	const [sessionRows, profileRows, tempRows, documentRows] = await Promise.all([
		db
			.select({ data: sessions.data })
			.from(sessions)
			.where(eq(sessions.sessionId, FINANCE_LIVE_SMOKE_SESSION_ID))
			.limit(1),
		db
			.select({ data: profiles.data })
			.from(profiles)
			.where(eq(profiles.sessionId, FINANCE_LIVE_SMOKE_SESSION_ID))
			.limit(1),
		db
			.select({ data: tempChatTurns.data })
			.from(tempChatTurns)
			.where(
				and(
					eq(tempChatTurns.sessionId, FINANCE_LIVE_SMOKE_SESSION_ID),
					eq(tempChatTurns.sequence, FINANCE_LIVE_SMOKE_SEQUENCE)
				)
			)
			.limit(1),
		db
			.select({ data: documents.data })
			.from(documents)
			.where(eq(documents.sessionId, FINANCE_LIVE_SMOKE_SESSION_ID)),
	]);
	return {
		session: sessionRows[0]?.data,
		profile: profileRows[0]?.data,
		tempTurn: tempRows[0]?.data,
		reports: documentRows.map(({ data }) => data).filter(isSmokeReport),
	};
};

const financeFixturesReady = (plan: FinanceFixtureSeedPlan): boolean =>
	plan.validationFailures.length === 0 &&
	plan.stableIdCollisions.length === 0 &&
	plan.plannedOperations.characters.inserts.length === 0 &&
	plan.plannedOperations.characters.updates.length === 0 &&
	plan.plannedOperations.lores.inserts.length === 0 &&
	plan.plannedOperations.lores.updates.length === 0 &&
	plan.plannedEmbeddings.providerCallSourceIds.length === 0 &&
	plan.plannedEmbeddings.metadataRefreshSourceIds.length === 0;

const evaluateChatSmoke = (turn: TempChatTurn | undefined, ownerId: string): ChatSmokeChecks => {
	const hasExpectedIdentity =
		Boolean(turn) && turn?.userId === ownerId && turn.sessionId === FINANCE_LIVE_SMOKE_SESSION_ID;
	const responseText = (turn?.chatTurnSets ?? [])
		.map(({ response }) => parseEntriesToConversation(response.entries))
		.join('\n');
	const sourceItems = turn?.ragEvidence?.items ?? [];
	return {
		hasResponse: hasExpectedIdentity && Boolean(turn?.chatTurnSets.length),
		hasFinanceEvidence: hasExpectedIdentity && turn?.ragEvidence?.domain === 'finance',
		hasLoreEvidence:
			hasExpectedIdentity && sourceItems.some(({ sourceKind }) => sourceKind === 'character_lore'),
		allEvidenceIsFinance:
			hasExpectedIdentity &&
			sourceItems.length > 0 &&
			sourceItems.every(({ domain }) => domain === 'finance'),
		hasFictionalMarker: hasExpectedIdentity && /fictional/i.test(responseText),
		hasNotAdviceDisclaimer: hasExpectedIdentity && /not financial advice/i.test(responseText),
		hasLoreCitation: hasExpectedIdentity && /\[[^\]]+_demo-lore\]/i.test(responseText),
	};
};

const allChecksPass = (checks: Record<string, boolean>): boolean =>
	Object.values(checks).every(Boolean);

const isDisclaimerOnlyChatFailure = (checks: ChatSmokeChecks): boolean =>
	!checks.hasNotAdviceDisclaimer &&
	Object.entries(checks)
		.filter(([key]) => key !== 'hasNotAdviceDisclaimer')
		.every(([, value]) => value);

const evaluateReportSmoke = (
	report: DocumentInfo | undefined,
	ownerId: string
): ReportSmokeChecks => {
	const hasExpectedIdentity =
		Boolean(report) &&
		report?.userId === ownerId &&
		report.sessionId === FINANCE_LIVE_SMOKE_SESSION_ID &&
		report.characterId === FINANCE_CHARACTER_ID;
	return {
		hasGeneratedDraft:
			hasExpectedIdentity && report?.origin === 'generated' && report.status === 'draft',
		ragDisabledByDefault:
			hasExpectedIdentity && report?.retrievalEnabled === false && report.includeInRag === false,
		hasFinancePromptVersion: hasExpectedIdentity && report?.promptVersion === 'finance-report-v6',
		hasLoreSources: hasExpectedIdentity && Boolean(report?.sourceRefs.loreIds.length),
		hasDemoDisclaimer:
			hasExpectedIdentity &&
			Boolean(
				report?.body.includes('fictional products and scenarios') &&
					report.body.includes('not financial advice')
			),
		hasNoUnsafeHtml:
			hasExpectedIdentity && !/<(?:script|iframe|object|embed)\b/i.test(report?.body ?? ''),
	};
};

export const buildFinanceLiveSmokePlan = (
	fixturePlan: FinanceFixtureSeedPlan,
	snapshot: SmokeSnapshot,
	ownerId: string | undefined,
	openAiEnvironmentKeyConfigured: boolean,
	modelName = DEFAULT_CHAT_MODEL
): FinanceLiveSmokePlan => {
	const validationFailures: FinanceLiveSmokePlan['validationFailures'] = [];
	const expectedSession = ownerId ? materializeSession(ownerId) : undefined;
	const expectedProfile = ownerId ? materializeProfile(ownerId) : undefined;
	const fixturesReady = financeFixturesReady(fixturePlan);
	const modelSupported = SELECTABLE_MODEL_INFO.direct.openai.includes(
		modelName as (typeof SELECTABLE_MODEL_INFO.direct.openai)[number]
	);
	const chatChecks = evaluateChatSmoke(snapshot.tempTurn, ownerId ?? '');
	const reportChecks = evaluateReportSmoke(snapshot.reports[0], ownerId ?? '');
	const disclaimerUpdatePending =
		Boolean(snapshot.tempTurn) && isDisclaimerOnlyChatFailure(chatChecks);

	if (!ownerId) {
		validationFailures.push({
			code: 'OWNER_UNRESOLVED',
			message: 'Select one existing local user with --owner-user-id.',
		});
	}
	if (!fixturesReady) {
		validationFailures.push({
			code: 'FINANCE_FIXTURES_NOT_READY',
			message: 'Finance Character, Lore, and embeddings must be unchanged before live smoke.',
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
	if (snapshot.session && expectedSession) {
		const matches =
			snapshot.session.userId === expectedSession.userId &&
			snapshot.session.characterId === expectedSession.characterId &&
			snapshot.session.profileId === expectedSession.profileId;
		if (!matches) {
			validationFailures.push({
				code: 'SESSION_STABLE_ID_COLLISION',
				message: 'The deterministic smoke Session ID is occupied by incompatible data.',
			});
		}
	}
	if (snapshot.profile && expectedProfile) {
		const matches =
			snapshot.profile.userId === expectedProfile.userId &&
			snapshot.profile.sessionId === expectedProfile.sessionId &&
			isDeepStrictEqual(snapshot.profile.domainProfile, expectedProfile.domainProfile);
		if (!matches) {
			validationFailures.push({
				code: 'PROFILE_STABLE_ID_COLLISION',
				message: 'The deterministic smoke Profile is incompatible with the canonical demo profile.',
			});
		}
	}
	if (snapshot.tempTurn && ownerId && !allChecksPass(chatChecks) && !disclaimerUpdatePending) {
		validationFailures.push({
			code: 'CHAT_SMOKE_ASSERTION_FAILED',
			message: 'The existing smoke response failed finance evidence, citation, or disclaimer checks.',
		});
	}
	if (
		ownerId &&
		snapshot.reports.some((report) => !allChecksPass(evaluateReportSmoke(report, ownerId)))
	) {
		validationFailures.push({
			code: 'REPORT_SMOKE_ASSERTION_FAILED',
			message: 'An existing smoke report failed draft, RAG-default, evidence, or safety checks.',
		});
	}
	if (snapshot.reports.length > 1) {
		validationFailures.push({
			code: 'DUPLICATE_SMOKE_REPORT',
			message: 'More than one generated report exists for the deterministic smoke request.',
		});
	}

	const chatPending = !snapshot.tempTurn;
	const reportPending = snapshot.reports.length === 0;
	const retrievalRuns = Number(chatPending) + Number(reportPending);
	const maximumQueryEmbeddingCalls = Number(chatPending) * 8 + Number(reportPending);
	const retrievalTransformationLlmCalls = Number(chatPending) * 2;
	return {
		mode: 'dry-run',
		modelName,
		safety: {
			databaseInspectionPerformed: true,
			databaseWritesAttempted: false,
			embeddingProviderCallsAttempted: false,
			llmProviderCallsAttempted: false,
		},
		ownerResolution: fixturePlan.ownerResolution,
		readiness: {
			financeFixturesReady: fixturesReady,
			openAiEnvironmentKeyConfigured,
			modelSupported,
		},
		currentState: {
			sessionExists: Boolean(snapshot.session),
			profileExists: Boolean(snapshot.profile),
			chatSmokeExists: Boolean(snapshot.tempTurn),
			reportSmokeCount: snapshot.reports.length,
		},
		verificationChecks: { chat: chatChecks, report: reportChecks },
		plannedWrites: {
			sessionInsert: !snapshot.session,
			profileInsert: !snapshot.profile,
			tempChatTurnInsert: chatPending,
			tempChatTurnDisclaimerUpdate: disclaimerUpdatePending,
			generatedReportInsert: reportPending,
		},
		plannedProviderCalls: {
			retrievalRuns,
			maximumQueryEmbeddingCalls,
			retrievalTransformationLlmCalls,
			chatGenerationLlmCalls: { minimum: chatPending ? 1 : 0, maximum: chatPending ? 2 : 0 },
			reportGenerationLlmCalls: reportPending ? 1 : 0,
			maximumLlmCalls:
				retrievalTransformationLlmCalls + (chatPending ? 2 : 0) + (reportPending ? 1 : 0),
		},
		validationFailures,
	};
};

const persistSmokeSessionAndProfile = async (ownerId: string): Promise<void> => {
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

const persistFinanceSmokeDisclaimer = async (
	tempTurn: TempChatTurn,
	ownerId: string
): Promise<void> => {
	if (
		tempTurn.userId !== ownerId ||
		tempTurn.sessionId !== FINANCE_LIVE_SMOKE_SESSION_ID ||
		tempTurn.chatTurnSets.length === 0
	) {
		throw new Error('The temporary chat turn is not eligible for disclaimer repair.');
	}
	const updatedAt = new Date().toISOString();
	const lastSetIndex = tempTurn.chatTurnSets.length - 1;
	const updated: TempChatTurn = {
		...tempTurn,
		updatedAt,
		chatTurnSets: tempTurn.chatTurnSets.map((set, index) =>
			index === lastSetIndex
				? {
						...set,
						response: {
							...set.response,
							entries: [...set.response.entries, { type: 'dialogue', prompt: FINANCE_DEMO_NOTICE }],
						},
					}
				: set
		),
	};
	await getDatabase()
		.update(tempChatTurns)
		.set({ data: updated, updatedAt })
		.where(
			and(
				eq(tempChatTurns.sessionId, FINANCE_LIVE_SMOKE_SESSION_ID),
				eq(tempChatTurns.sequence, FINANCE_LIVE_SMOKE_SEQUENCE),
				eq(tempChatTurns.userId, ownerId)
			)
		);
};

const applyFinanceLiveSmoke = async (
	ownerId: string,
	modelName: string,
	snapshot: SmokeSnapshot
): Promise<void> => {
	await persistSmokeSessionAndProfile(ownerId);
	const [characterResponse, aiModelInfo] = await Promise.all([
		characterStore.getCharacter(FINANCE_CHARACTER_ID),
		modelCatalogService.resolveAiModelInfo(modelName),
	]);
	const character: CharacterInfo = characterResponse.characterInfo;
	const profile = materializeProfile(ownerId);
	const session = materializeSession(ownerId);

	if (
		snapshot.tempTurn &&
		isDisclaimerOnlyChatFailure(evaluateChatSmoke(snapshot.tempTurn, ownerId))
	) {
		await persistFinanceSmokeDisclaimer(snapshot.tempTurn, ownerId);
	}
	if (!snapshot.tempTurn) {
		await receiveBotResponse(
			{
				sessionId: FINANCE_LIVE_SMOKE_SESSION_ID,
				sequence: FINANCE_LIVE_SMOKE_SEQUENCE,
				userId: ownerId,
				inputJsonString: JSON.stringify([{ type: 'dialogue', prompt: FINANCE_LIVE_SMOKE_REQUEST }]),
			},
			character,
			profile,
			aiModelInfo,
			'[]'
		);
	}
	if (snapshot.reports.length === 0) {
		await financeReportService.generateDraft(
			{ sessionId: FINANCE_LIVE_SMOKE_SESSION_ID, requestText: FINANCE_LIVE_SMOKE_REQUEST, modelName },
			ownerId,
			session
		);
	}
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
	const fixtureSnapshot = await inspectFinanceFixtureDatabase();
	const fixturePlan = buildFinanceFixtureSeedPlan(fixtureSnapshot, ownerId);
	const snapshot = await inspectFinanceLiveSmoke();
	const plan = buildFinanceLiveSmokePlan(
		fixturePlan,
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
	if (!ownerId) throw new Error('An explicit finance live-smoke owner is required.');

	await applyFinanceLiveSmoke(ownerId, modelName, snapshot);
	const verificationFixtureSnapshot = await inspectFinanceFixtureDatabase();
	const verificationSnapshot = await inspectFinanceLiveSmoke();
	const verification = buildFinanceLiveSmokePlan(
		buildFinanceFixtureSeedPlan(verificationFixtureSnapshot, ownerId),
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

const isDirectExecution = process.argv[1]?.endsWith('financeLiveSmoke.ts');
if (isDirectExecution) {
	try {
		await run();
	} finally {
		await closeDatabase();
	}
}
