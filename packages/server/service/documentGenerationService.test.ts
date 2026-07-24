import assert from 'node:assert/strict';
import test from 'node:test';
import type { MemoryResponse } from '@rag-advisor-demo/shared/api';
import {
	documentDraftRewriteSchema,
	financeReportDraftCreateSchema,
	generatedDocumentDraftCreateSchema,
} from '@rag-advisor-demo/shared/domain';
import {
	buildDocumentSourceRefs,
	generatedDocumentSchema,
	resolveDocumentGroundingMode,
} from './documentGenerationService.js';

const memories: MemoryResponse = {
	langCode: 'kor',
	shortTermHistory: [],
	longTermHistory: [],
	relevantLore: [],
	relevantHistory: [],
};

test('document grounding is invented when the server selected no sources', () => {
	const refs = buildDocumentSourceRefs(memories);
	assert.equal(resolveDocumentGroundingMode(refs, false), 'invented');
});

test('document grounding distinguishes constrained and mixed artifacts', () => {
	const refs = { ...buildDocumentSourceRefs(memories), chatTurnIds: ['turn-1'] };
	assert.equal(resolveDocumentGroundingMode(refs, false), 'grounded');
	assert.equal(resolveDocumentGroundingMode(refs, true), 'mixed');
});

test('document generation schema requires nullable metadata for strict structured output', () => {
	const parsed = generatedDocumentSchema.parse({
		title: 'SCP object document',
		body: 'Document body',
		documentKind: null,
		issuer: null,
		viewpoint: null,
		includesInventedDetails: true,
	});

	assert.equal(parsed.documentKind, null);
	assert.throws(() =>
		generatedDocumentSchema.parse({
			title: 'SCP object document',
			body: 'Document body',
			includesInventedDetails: true,
		})
	);
});

test('document generation request requires the RAG intent before generation', () => {
	assert.equal(
		generatedDocumentDraftCreateSchema.parse({
			sessionId: 'session-1',
			requestText: 'Create a report.',
			modelName: 'model-1',
			includeInRag: true,
		}).includeInRag,
		true
	);
	assert.throws(() =>
		generatedDocumentDraftCreateSchema.parse({
			sessionId: 'session-1',
			requestText: 'Create a report.',
			modelName: 'model-1',
		})
	);
});

test('finance report requests cannot opt generated reports into RAG at creation', () => {
	const parsed = financeReportDraftCreateSchema.parse({
		sessionId: 'session-1',
		requestText: 'Create a personalized fictional finance report.',
		modelName: 'model-1',
	});

	assert.deepEqual(parsed, {
		sessionId: 'session-1',
		requestText: 'Create a personalized fictional finance report.',
		modelName: 'model-1',
	});
	assert.throws(() => financeReportDraftCreateSchema.parse({ ...parsed, includeInRag: true }));
});

test('document rewrite request requires edit instruction, model, and expected revision', () => {
	const parsed = documentDraftRewriteSchema.parse({
		editInstruction: 'Make it sound like an SCP containment note.',
		modelName: 'model-1',
		expectedRevision: 3,
		includeInRag: false,
		sessionId: 'forged-session',
	});

	assert.deepEqual(parsed, {
		editInstruction: 'Make it sound like an SCP containment note.',
		modelName: 'model-1',
		expectedRevision: 3,
	});
	assert.throws(() =>
		documentDraftRewriteSchema.parse({ editInstruction: 'Make it shorter.', modelName: 'model-1' })
	);
});
