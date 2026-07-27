import assert from 'node:assert/strict';
import test from 'node:test';
import type { ChatTurnCdo, RagEvidenceDto } from '@rag-advisor-demo/shared/domain';
import { createBasicChatTurn } from '@rag-advisor-demo/shared/util';
import { REQUEST_CHARACTER_LIMIT } from '@rag-advisor-demo/shared/config';
import {
	ChatTurnCdoSchema,
	createGlossaryExtractionSchema,
	createPersonaResponseSchema,
	ReceiveBotResponseBodySchema,
} from './schemaUtils.js';

const sessionId = 'finance_demo_session';

const ragEvidence: RagEvidenceDto = {
	domain: 'finance',
	characterId: 'finance_demo',
	sessionId,
	profileFieldsUsed: [],
	items: [
		{
			sourceKind: 'character_lore',
			sourceId: 'demo-product_demo-lore',
			label: 'DEMO product',
			domain: 'finance',
		},
	],
	excluded: [],
	structuredFilterDecisions: [],
	missingInformation: [],
	assumptions: [],
};

test('glossary extraction schema accepts canonical Korean and English mappings', () => {
	const result = createGlossaryExtractionSchema().parse({
		terms: [
			{ koreanTerm: '균형 성장 펀드', englishTerm: 'Balanced Growth Fund' },
			{ koreanTerm: '예금자 보호', englishTerm: 'Deposit Protection' },
		],
	});

	assert.equal(result.terms.length, 2);
	assert.equal(result.terms[0]?.englishTerm, 'Balanced Growth Fund');
});

test('glossary extraction schema rejects empty term mappings', () => {
	assert.throws(() =>
		createGlossaryExtractionSchema().parse({
			terms: [{ koreanTerm: '', englishTerm: 'Balanced Growth Fund' }],
		})
	);
});

const buildMessage = (messageType: 'request' | 'response') => ({
	role: messageType === 'request' ? ('user' as const) : ('assistant' as const),
	type: 'message',
	model: messageType === 'request' ? '' : 'gpt-4o-mini',
	emotion: 'neutral',
	entries: [{ type: 'dialogue' as const, prompt: 'Hello' }],
	sequence: 9,
	showName: messageType === 'request' ? 'User' : 'Advisor',
	createdAt: '',
	messageId: '',
	sessionId,
	updatedAt: '',
	messageType,
});

test('ChatTurnCdoSchema accepts lifecycle placeholders from temporary turns', () => {
	const result = ChatTurnCdoSchema.safeParse({
		userId: 'user-1',
		sessionId,
		sequence: 9,
		request: buildMessage('request') as ChatTurnCdo['request'],
		response: buildMessage('response') as ChatTurnCdo['response'],
	});

	assert.equal(result.success, true);
	if (!result.success) return;

	const turn = createBasicChatTurn(result.data as ChatTurnCdo);
	assert.equal(turn.request.messageId, `${sessionId}_9_request`);
	assert.equal(turn.response.messageId, `${sessionId}_9_response`);
	assert.notEqual(turn.request.createdAt, '');
	assert.notEqual(turn.request.updatedAt, '');
	assert.notEqual(turn.response.createdAt, '');
	assert.notEqual(turn.response.updatedAt, '');
});

test('basic finalized turns preserve server-attached sanitized RAG evidence', () => {
	const turn = createBasicChatTurn({
		userId: 'user-1',
		sessionId,
		sequence: 9,
		request: buildMessage('request') as ChatTurnCdo['request'],
		response: buildMessage('response') as ChatTurnCdo['response'],
		ragEvidence,
	});

	assert.deepEqual(turn.ragEvidence, ragEvidence);
});

test('ChatTurnCdoSchema still rejects mismatched nested message identity', () => {
	const result = ChatTurnCdoSchema.safeParse({
		userId: 'user-1',
		sessionId,
		sequence: 9,
		request: { ...buildMessage('request'), sequence: 8 },
		response: buildMessage('response'),
	});

	assert.equal(result.success, false);
});

test('ReceiveBotResponseBodySchema accepts generation requests without a content-mode override', () => {
	const result = ReceiveBotResponseBodySchema.safeParse({
		sessionId,
		sequence: 10,
		entries: [{ type: 'dialogue', prompt: 'Continue.' }],
		modelName: 'gpt-4o-mini',
	});

	assert.equal(result.success, true);
});

test('ReceiveBotResponseBodySchema rejects a client-supplied legacy scene override', () => {
	const result = ReceiveBotResponseBodySchema.safeParse({
		sessionId,
		sequence: 10,
		entries: [{ type: 'dialogue', prompt: 'Continue.' }],
		modelName: 'gpt-4o-mini',
		isScene: true,
	});

	assert.equal(result.success, false);
});

test('ReceiveBotResponseBodySchema rejects requests over the shared character limit', () => {
	const result = ReceiveBotResponseBodySchema.safeParse({
		sessionId,
		sequence: 10,
		entries: [{ type: 'dialogue', prompt: 'x'.repeat(REQUEST_CHARACTER_LIMIT + 1) }],
		modelName: 'gpt-4o-mini',
	});

	assert.equal(result.success, false);
});

test('persona and finalization schemas accept generated responses longer than the edit limit', () => {
	const generatedResponse = 'x'.repeat(6000);
	const personaResult = createPersonaResponseSchema('Advisor', 'User', 'eng').safeParse({
		groundingDecision: 'not_applicable',
		response: generatedResponse,
		emotion: 'neutral',
	});
	const finalizationResult = ChatTurnCdoSchema.safeParse({
		userId: 'user-1',
		sessionId,
		sequence: 9,
		request: buildMessage('request'),
		response: {
			...buildMessage('response'),
			entries: [{ type: 'dialogue', prompt: generatedResponse }],
		},
	});

	assert.equal(personaResult.success, true);
	assert.equal(finalizationResult.success, true);
});
