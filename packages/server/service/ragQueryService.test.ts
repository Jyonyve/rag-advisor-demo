import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getAiModelInfo } from '@rag-advisor-demo/shared/util';

import { llmService } from './llmService.js';
import { MAX_RETRIEVAL_QUERY_TEXTS, ragQueryService } from './ragQueryService.js';

test('retrieval query expansion is deterministic and can be bounded by callers', () => {
	const expanded = ragQueryService._expandQuery({
		topics: ['reserve', 'income', 'growth'],
		keywords: ['liquidity', 'horizon', 'risk'],
		entities: { characters: ['Cedar', 'Harbor', 'Summit'] },
		criticalTerm: 'principal',
	});

	assert.deepEqual(expanded.slice(0, MAX_RETRIEVAL_QUERY_TEXTS - 1), [
		'reserve',
		'income',
		'growth',
		'liquidity',
		'horizon',
		'risk',
		'Cedar',
	]);
	assert.equal(MAX_RETRIEVAL_QUERY_TEXTS, 8);
});

test('direct retrieval preserves one multilingual query without LLM expansion', () => {
	assert.deepEqual(ragQueryService.createDirectQuery('1년 뒤 이사비로 사용할 자금'), {
		queryTexts: ['1년 뒤 이사비로 사용할 자금'],
		termAliases: [],
	});
});

test('query translation uses the user-selected model', async () => {
	const originalInvokeLlm = llmService.invokeLlm;
	const selectedModel = getAiModelInfo('anthropic/claude-sonnet-5');
	let capturedModel = undefined as typeof selectedModel | undefined;
	llmService.invokeLlm = (async (_messages, modelInfo) => {
		capturedModel = modelInfo;
		return 'translated query';
	}) as typeof llmService.invokeLlm;

	try {
		const translated = await ragQueryService._translateToEnglish(
			'한국어 질문',
			new Map(),
			'test-user',
			selectedModel
		);

		assert.equal(translated, 'translated query');
		assert.equal(capturedModel, selectedModel);
	} finally {
		llmService.invokeLlm = originalInvokeLlm;
	}
});
