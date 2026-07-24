import assert from 'node:assert/strict';
import test from 'node:test';
import {
	documentDraftUpdateSchema,
	manualDocumentDraftCreateSchema,
	type DocumentInfo,
} from '@rag-advisor-demo/shared/domain';
import { ApiError } from '@rag-advisor-demo/shared/domain';
import {
	applyDocumentDraftRewrite,
	applyDocumentDraftUpdate,
	documentToEmbeddingContent,
} from './documentStore.js';

const draft = (overrides: Partial<DocumentInfo> = {}): DocumentInfo => ({
	documentId: 'session-1_abcd_document',
	userId: 'user-1',
	sessionId: 'session-1',
	characterId: 'character-1',
	origin: 'manual',
	status: 'draft',
	retrievalEnabled: false,
	includeInRag: false,
	title: '균형 성장 펀드 요약서',
	body: '엔스테 실종과 관련한 내부 보고 내용.',
	documentKind: '사건 보고서',
	issuer: '가상 자산운용사',
	viewpoint: '한국지부 조사팀',
	groundingMode: 'invented',
	sourceRefs: { chatTurnIds: [], loreIds: [], historyIds: [], recapIds: [], documentIds: [] },
	revision: 1,
	createdAt: '2026-07-21T00:00:00.000Z',
	updatedAt: '2026-07-21T00:00:00.000Z',
	...overrides,
});

test('manual draft input cannot set server-owned identity, lifecycle, or provenance', () => {
	const parsed = manualDocumentDraftCreateSchema.parse({
		sessionId: 'session-1',
		title: '보고서',
		body: '내용',
		userId: 'attacker',
		status: 'approved',
		retrievalEnabled: true,
		sourceRefs: { chatTurnIds: ['forged-turn'] },
	});

	assert.deepEqual(parsed, { sessionId: 'session-1', title: '보고서', body: '내용' });
});

test('draft update increments revision and preserves retrieval isolation', () => {
	const input = documentDraftUpdateSchema.parse({ title: '수정된 보고서', expectedRevision: 1 });
	const updated = applyDocumentDraftUpdate(draft(), input, '2026-07-21T01:00:00.000Z');

	assert.equal(updated.title, '수정된 보고서');
	assert.equal(updated.revision, 2);
	assert.equal(updated.status, 'draft');
	assert.equal(updated.retrievalEnabled, false);
});

test('approved documents cannot be edited as drafts', () => {
	assert.throws(
		() =>
			applyDocumentDraftUpdate(
				draft({ status: 'approved', retrievalEnabled: true }),
				{ body: '변조', expectedRevision: 1 },
				'2026-07-21T01:00:00.000Z'
			),
		(error) => error instanceof ApiError && error.status === 409
	);
});

test('stale draft revisions are rejected', () => {
	assert.throws(
		() =>
			applyDocumentDraftUpdate(
				draft({ revision: 2 }),
				{ body: '오래된 수정', expectedRevision: 1 },
				'2026-07-21T01:00:00.000Z'
			),
		(error) => error instanceof ApiError && error.status === 409
	);
});

test('embedding text labels the document as viewpoint-bound material', () => {
	const content = documentToEmbeddingContent(draft({ groundingMode: 'mixed' }));

	assert.match(content, /In-world document/);
	assert.match(content, /Issuer: 가상 자산운용사/);
	assert.match(content, /Viewpoint: 한국지부 조사팀/);
	assert.match(content, /Grounding: mixed/);
	assert.match(content, /엔스테 실종/);
});

test('draft RAG preference does not make the draft retrievable', () => {
	const updated = applyDocumentDraftUpdate(
		draft(),
		{ includeInRag: true, expectedRevision: 1 },
		'2026-07-21T01:00:00.000Z'
	);

	assert.equal(updated.includeInRag, true);
	assert.equal(updated.retrievalEnabled, false);
});

test('AI draft rewrite preserves draft isolation and existing RAG preference', () => {
	const updated = applyDocumentDraftRewrite(
		draft({ includeInRag: true }),
		{
			editInstruction: 'Rewrite as a prospectus summary.',
			modelName: 'model-1',
			expectedRevision: 1,
		},
		{
			title: '균형 성장 펀드 설명서',
			body: '개정된 보고 내용.',
			documentKind: '내부 보고서',
			issuer: '가상 자산운용사',
			viewpoint: '기록 담당자',
			groundingMode: 'grounded',
			requestText: 'Rewrite as a prospectus summary.',
			sourceRefs: {
				chatTurnIds: ['turn-1'],
				loreIds: [],
				historyIds: [],
				recapIds: [],
				documentIds: [],
			},
			modelName: 'model-1',
			promptVersion: 'in-world-document-rewrite-v1',
		},
		'2026-07-21T01:00:00.000Z'
	);

	assert.equal(updated.origin, 'generated');
	assert.equal(updated.status, 'draft');
	assert.equal(updated.retrievalEnabled, false);
	assert.equal(updated.includeInRag, true);
	assert.equal(updated.revision, 2);
	assert.equal(updated.sourceRefs.chatTurnIds[0], 'turn-1');
});
