import assert from 'node:assert/strict';
import test from 'node:test';

import type { MemoryResponse } from '@rag-advisor-demo/shared/api';
import { METADATA_TYPES } from '@rag-advisor-demo/shared/config';
import {
	type ChatTurn,
	type DocumentInfo,
	type ProfileInfo,
} from '@rag-advisor-demo/shared/domain';
import { buildSessionId } from '@rag-advisor-demo/shared/util';

import { DEMO_CHARACTER_FIXTURES, DEMO_LORE_FIXTURES } from '../fixture/domainFixtures.js';
import { resolveRagContext } from './ragContextService.js';

const USER_ID = 'rag-context-demo-user';
const FINANCE_CHARACTER = DEMO_CHARACTER_FIXTURES[0].character;
const HEALTHCARE_CHARACTER = DEMO_CHARACTER_FIXTURES[1].character;

const profile = (
	sessionId: string,
	domainProfile: ProfileInfo['domainProfile'],
	overrides: Partial<ProfileInfo> = {}
): ProfileInfo => ({
	profileId: `${sessionId}_${USER_ID}`,
	sessionId,
	userId: USER_ID,
	name: 'Demo User',
	showName: 'Demo User',
	title: 'Fictional demo profile',
	description: 'Fictional session profile used for deterministic tests.',
	gender: 'nocomment',
	type: METADATA_TYPES.PROFILE,
	createdAt: '2026-07-24T00:00:00.000Z',
	updatedAt: '2026-07-24T00:00:00.000Z',
	domainProfile,
	...overrides,
});

const chatMemory = (
	sessionId: string,
	chatTurnId: string,
	overrides: Partial<ChatTurn> = {}
): ChatTurn => ({ chatTurnId, sessionId, userId: USER_ID, sequence: 1, ...overrides }) as ChatTurn;

const document = (
	sessionId: string,
	documentId: string,
	overrides: Partial<DocumentInfo> = {}
): DocumentInfo => ({
	documentId,
	userId: USER_ID,
	sessionId,
	characterId: FINANCE_CHARACTER.characterId,
	origin: 'manual',
	status: 'approved',
	retrievalEnabled: true,
	includeInRag: true,
	title: 'Fictional demo reference',
	body: 'Fictional canonical document body that must not appear in evidence.',
	groundingMode: 'grounded',
	sourceRefs: { chatTurnIds: [], loreIds: [], historyIds: [], recapIds: [], documentIds: [] },
	revision: 1,
	createdAt: '2026-07-24T00:00:00.000Z',
	updatedAt: '2026-07-24T00:00:00.000Z',
	...overrides,
});

const memories = (overrides: Partial<MemoryResponse> = {}): MemoryResponse => ({
	langCode: 'eng',
	shortTermHistory: [],
	longTermHistory: [],
	relevantLore: [],
	relevantHistory: [],
	relevantDocuments: [],
	relevantRecaps: [],
	factualRecapSummary: '',
	relationshipRecapSummary: '',
	...overrides,
});

test('resolves finance context without altering the current message and exposes sanitized evidence', () => {
	const sessionId = buildSessionId(FINANCE_CHARACTER.characterId);
	const rawMessage = 'Assume I may need the funds in six months for this answer only.';
	const manualDocument = document(sessionId, 'manual-reference_demo-document');
	const generatedDocument = document(sessionId, 'generated-reference_demo-document', {
		origin: 'generated',
	});
	const resolved = resolveRagContext({
		sessionId,
		userId: USER_ID,
		currentMessage: rawMessage,
		character: FINANCE_CHARACTER,
		profile: profile(sessionId, {
			domain: 'finance',
			investmentGoal: 'Fictional medium-term savings goal',
			constraints: [],
		}),
		memories: memories({
			longTermHistory: [chatMemory(sessionId, 'finance-memory_demo-chat')],
			relevantLore: [{ ...DEMO_LORE_FIXTURES[0], userId: USER_ID }],
			relevantDocuments: [manualDocument, generatedDocument],
		}),
	});

	assert.equal(resolved.currentMessage, rawMessage);
	assert.equal(resolved.domain, 'finance');
	assert.deepEqual(resolved.evidence.profileFieldsUsed, ['domain', 'investmentGoal']);
	assert.deepEqual(
		resolved.evidence.missingInformation.map(({ field }) => field),
		['investmentHorizonMonths', 'liquidityNeed', 'riskPreference']
	);
	assert.deepEqual(
		resolved.evidence.items
			.filter(({ sourceKind }) => sourceKind === 'session_document')
			.map(({ origin }) => origin),
		['manual', 'generated']
	);
	const serializedEvidence = JSON.stringify(resolved.evidence);
	assert.equal(serializedEvidence.includes(manualDocument.body), false);
	assert.equal(serializedEvidence.includes(USER_ID), false);
});

test('excludes cross-owner, cross-session, cross-Character, cross-domain, and disabled retrieval data', () => {
	const sessionId = buildSessionId(FINANCE_CHARACTER.characterId);
	const otherSessionId = buildSessionId(FINANCE_CHARACTER.characterId);
	const resolved = resolveRagContext({
		sessionId,
		userId: USER_ID,
		currentMessage: 'Compare the fictional demo references.',
		character: FINANCE_CHARACTER,
		profile: profile(sessionId, { domain: 'finance', constraints: [] }),
		memories: memories({
			longTermHistory: [
				chatMemory(sessionId, 'owned-memory_demo-chat'),
				chatMemory(sessionId, 'foreign-memory_demo-chat', { userId: 'other-user' }),
				chatMemory(otherSessionId, 'other-session-memory_demo-chat'),
			],
			relevantLore: [
				{ ...DEMO_LORE_FIXTURES[0], userId: USER_ID },
				{ ...DEMO_LORE_FIXTURES[0], loreId: 'foreign-lore_demo-lore', userId: 'other-user' },
				{
					...DEMO_LORE_FIXTURES[0],
					loreId: 'wrong-domain_demo-lore',
					userId: USER_ID,
					domain: 'healthcare_operations',
				},
				{
					...DEMO_LORE_FIXTURES[0],
					loreId: 'wrong-character_demo-lore',
					userId: USER_ID,
					characterIds: [HEALTHCARE_CHARACTER.characterId],
				},
			],
			relevantDocuments: [
				document(sessionId, 'eligible_demo-document'),
				document(sessionId, 'foreign_demo-document', { userId: 'other-user' }),
				document(otherSessionId, 'other-session_demo-document'),
				document(sessionId, 'wrong-character_demo-document', {
					characterId: HEALTHCARE_CHARACTER.characterId,
				}),
				document(sessionId, 'disabled_demo-document', { includeInRag: false, retrievalEnabled: false }),
			],
		}),
	});

	assert.deepEqual(
		resolved.memories.longTermHistory.map(({ chatTurnId }) => chatTurnId),
		['owned-memory_demo-chat']
	);
	assert.deepEqual(
		resolved.memories.relevantLore.map(({ loreId }) => loreId),
		[DEMO_LORE_FIXTURES[0].loreId]
	);
	assert.deepEqual(
		resolved.memories.relevantDocuments?.map(({ documentId }) => documentId),
		['eligible_demo-document']
	);
	assert.deepEqual(
		resolved.evidence.excluded.map(({ sourceKind, reason, count }) => ({
			sourceKind,
			reason,
			count,
		})),
		[
			{ sourceKind: 'chat_memory', reason: 'ownership_mismatch', count: 1 },
			{ sourceKind: 'chat_memory', reason: 'session_mismatch', count: 1 },
			{ sourceKind: 'character_lore', reason: 'ownership_mismatch', count: 1 },
			{ sourceKind: 'character_lore', reason: 'domain_mismatch', count: 1 },
			{ sourceKind: 'character_lore', reason: 'character_mismatch', count: 1 },
			{ sourceKind: 'session_document', reason: 'ownership_mismatch', count: 1 },
			{ sourceKind: 'session_document', reason: 'session_mismatch', count: 1 },
			{ sourceKind: 'session_document', reason: 'character_mismatch', count: 1 },
			{ sourceKind: 'session_document', reason: 'not_retrieval_eligible', count: 1 },
		]
	);
	const serializedEvidence = JSON.stringify(resolved.evidence);
	assert.equal(serializedEvidence.includes('foreign-memory_demo-chat'), false);
	assert.equal(serializedEvidence.includes('foreign-lore_demo-lore'), false);
	assert.equal(serializedEvidence.includes('foreign_demo-document'), false);
});

test('uses the same resolver for healthcare operations context', () => {
	const sessionId = buildSessionId(HEALTHCARE_CHARACTER.characterId);
	const resolved = resolveRagContext({
		sessionId,
		userId: USER_ID,
		currentMessage: 'Show the fictional administrative workflow.',
		character: HEALTHCARE_CHARACTER,
		profile: profile(sessionId, {
			domain: 'healthcare_operations',
			requesterRole: 'admin_staff',
			constraints: [],
		}),
		memories: memories({ relevantLore: [{ ...DEMO_LORE_FIXTURES[1], userId: USER_ID }] }),
	});

	assert.equal(resolved.domain, 'healthcare_operations');
	assert.deepEqual(resolved.evidence.profileFieldsUsed, ['domain', 'requesterRole']);
	assert.deepEqual(
		resolved.evidence.items.map(({ sourceId }) => sourceId),
		[DEMO_LORE_FIXTURES[1].loreId]
	);
});

test('rejects mismatched Character, Profile ownership, and Profile domain before context use', () => {
	const sessionId = buildSessionId(FINANCE_CHARACTER.characterId);
	assert.throws(
		() =>
			resolveRagContext({
				sessionId,
				userId: USER_ID,
				currentMessage: 'Demo request',
				character: HEALTHCARE_CHARACTER,
				profile: profile(sessionId, { domain: 'finance', constraints: [] }),
				memories: memories(),
			}),
		/Session Character does not match/
	);
	assert.throws(
		() =>
			resolveRagContext({
				sessionId,
				userId: USER_ID,
				currentMessage: 'Demo request',
				character: FINANCE_CHARACTER,
				profile: profile(sessionId, { domain: 'finance', constraints: [] }, { userId: 'other-user' }),
				memories: memories(),
			}),
		/Profile ownership or scope/
	);
	assert.throws(
		() =>
			resolveRagContext({
				sessionId,
				userId: USER_ID,
				currentMessage: 'Demo request',
				character: FINANCE_CHARACTER,
				profile: profile(sessionId, { domain: 'healthcare_operations', constraints: [] }),
				memories: memories(),
			}),
		/does not match Character domain/
	);
});
