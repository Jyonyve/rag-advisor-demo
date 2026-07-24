import assert from 'node:assert/strict';
import test from 'node:test';
import { getAiModelInfo } from '@rag-advisor-demo/shared/util';
import { MODEL_LIMITS_INFO } from '@rag-advisor-demo/shared/config';
import { SupportAiModelList, type AiModelInfo } from '@rag-advisor-demo/shared/domain';
import { buildTokenBudget } from '../util/tokenBudgetUtils.js';
import { z } from 'zod';
import { llmService } from './llmService.js';
import { StructuredOutputValidationError } from '../util/structuredOutputUtils.js';
import { flowLogger } from '../util/jsonlLogger.js';

test('buildTokenBudget reserves output tokens inside the context window', () => {
	const aiModelInfo = getAiModelInfo('openai/gpt-5.6-terra');
	const budget = buildTokenBudget(20_000, aiModelInfo);

	assert.deepEqual(budget, {
		inputTokens: 20_000,
		reservedOutputTokens: 8_192,
		contextWindow: 1_050_000,
		availableInputTokens: 1_041_808,
	});
});

test('buildTokenBudget respects a smaller configured output reservation', () => {
	const aiModelInfo = { ...getAiModelInfo('openai/gpt-5.6-terra'), maxTokens: 4_096 };
	const budget = buildTokenBudget(20_000, aiModelInfo);

	assert.equal(budget?.reservedOutputTokens, 4_096);
	assert.equal(budget?.availableInputTokens, 1_045_904);
});

test('buildTokenBudget returns null when model limits are unavailable', () => {
	const aiModelInfo = {
		platform: 'openrouter',
		provider: 'openai',
		model: 'openai/not-configured',
		maxTokens: 1_500,
	} as unknown as AiModelInfo;

	assert.equal(buildTokenBudget(20_000, aiModelInfo), null);
});

test('model defaults omit unsupported temperature parameters', () => {
	assert.equal(getAiModelInfo('openai/gpt-5.6-terra').temperature, undefined);
	assert.equal(getAiModelInfo('anthropic/claude-sonnet-5').temperature, undefined);
	assert.equal(getAiModelInfo('google/gemini-3.5-flash').temperature, 0.85);
});

test('selectable model registry contains current metadata and excludes retired models', () => {
	for (const model of SupportAiModelList) {
		assert.ok(MODEL_LIMITS_INFO[model], `Missing model limits for ${model}`);
	}
	assert.equal(SupportAiModelList.includes('anthropic/claude-3.7-sonnet'), false);
	assert.equal(SupportAiModelList.includes('google/gemini-2.0-flash-001'), false);
});

test('invokeStructuredLlm returns a typed object from validated model output', async () => {
	const originalCreateLlmInstance = llmService.createLlmInstance;
	const originalValidateTokenCount = llmService.validateTokenCount;
	llmService.validateTokenCount = (async () => undefined) as typeof llmService.validateTokenCount;
	llmService.createLlmInstance = (async () => ({
		invoke: async () => ({ content: '{"properNouns":["Balanced Growth Fund"]}' }),
	})) as unknown as typeof llmService.createLlmInstance;

	try {
		const result = await llmService.invokeStructuredLlm(
			[],
			getAiModelInfo('openai/gpt-5.6-terra'),
			'test-user',
			z.object({ properNouns: z.array(z.string()) })
		);

		assert.deepEqual(result, { properNouns: ['Balanced Growth Fund'] });
	} finally {
		llmService.createLlmInstance = originalCreateLlmInstance;
		llmService.validateTokenCount = originalValidateTokenCount;
	}
});

test('invokeStructuredLlm uses native structured output for every direct provider', async () => {
	const originalCreateLlmInstance = llmService.createLlmInstance;
	const originalValidateTokenCount = llmService.validateTokenCount;
	const directModels = [
		{ platform: 'direct', provider: 'openai', model: 'gpt-4o-mini' },
		{ platform: 'direct', provider: 'anthropic', model: 'claude-sonnet-5' },
		{ platform: 'direct', provider: 'google', model: 'gemini-3.5-flash' },
	] as const;
	let nativeInvocationCount = 0;

	llmService.validateTokenCount = (async () => undefined) as typeof llmService.validateTokenCount;
	llmService.createLlmInstance = (async () => ({
		withStructuredOutput: () => ({
			invoke: async () => {
				nativeInvocationCount += 1;
				return { parsed: { properNouns: ['Balanced Growth Fund'] }, raw: { content: '' } };
			},
		}),
		invoke: async () => {
			throw new Error('manual invocation should not run');
		},
	})) as unknown as typeof llmService.createLlmInstance;

	try {
		for (const model of directModels) {
			const result = await llmService.invokeStructuredLlm(
				[],
				{ ...model, maxTokens: 2_000 } as AiModelInfo,
				'test-user',
				z.object({ properNouns: z.array(z.string()) })
			);
			assert.deepEqual(result, { properNouns: ['Balanced Growth Fund'] });
		}
		assert.equal(nativeInvocationCount, directModels.length);
	} finally {
		llmService.createLlmInstance = originalCreateLlmInstance;
		llmService.validateTokenCount = originalValidateTokenCount;
	}
});

test('invokeStructuredLlm validates native raw output when provider parsing is unavailable', async () => {
	const originalCreateLlmInstance = llmService.createLlmInstance;
	const originalValidateTokenCount = llmService.validateTokenCount;
	llmService.validateTokenCount = (async () => undefined) as typeof llmService.validateTokenCount;
	llmService.createLlmInstance = (async () => ({
		withStructuredOutput: () => ({
			invoke: async () => ({
				parsed: null,
				raw: { content: '{"properNouns":["Balanced Growth Fund"]}' },
			}),
		}),
	})) as unknown as typeof llmService.createLlmInstance;

	try {
		const result = await llmService.invokeStructuredLlm(
			[],
			{ platform: 'direct', provider: 'openai', model: 'gpt-4o-mini', maxTokens: 2_000 },
			'test-user',
			z.object({ properNouns: z.array(z.string()) })
		);

		assert.deepEqual(result, { properNouns: ['Balanced Growth Fund'] });
	} finally {
		llmService.createLlmInstance = originalCreateLlmInstance;
		llmService.validateTokenCount = originalValidateTokenCount;
	}
});

test('streamStructuredLlm returns a typed object while preserving raw delta callbacks', async () => {
	const originalCreateLlmInstance = llmService.createLlmInstance;
	const originalValidateTokenCount = llmService.validateTokenCount;
	const deltas: string[] = [];
	llmService.validateTokenCount = (async () => undefined) as typeof llmService.validateTokenCount;
	llmService.createLlmInstance = (async () => ({
		stream: async function* () {
			yield { content: '{"response":"Hel' };
			yield { content: 'lo","emotion":"happy"}' };
		},
	})) as unknown as typeof llmService.createLlmInstance;

	try {
		const result = await llmService.streamStructuredLlm(
			[],
			getAiModelInfo('openai/gpt-5.6-terra'),
			'test-user',
			(delta) => deltas.push(delta),
			z.object({ response: z.string(), emotion: z.string() })
		);

		assert.deepEqual(result, { response: 'Hello', emotion: 'happy' });
		assert.deepEqual(deltas, ['{"response":"Hel', 'lo","emotion":"happy"}']);
	} finally {
		llmService.createLlmInstance = originalCreateLlmInstance;
		llmService.validateTokenCount = originalValidateTokenCount;
	}
});

test('repairStructuredLlmOutput delegates malformed output repair through structured invocation', async () => {
	const originalInvokeStructuredLlm = llmService.invokeStructuredLlm;
	let capturedPrompt = '';
	llmService.invokeStructuredLlm = (async (messages) => {
		capturedPrompt = String(messages[0]?.content ?? '');
		return { response: 'Hello', emotion: 'happy' };
	}) as typeof llmService.invokeStructuredLlm;

	try {
		const result = await llmService.repairStructuredLlmOutput(
			new StructuredOutputValidationError('The model returned malformed JSON.', '{"response":'),
			'test-user',
			z.object({ response: z.string(), emotion: z.string() }),
			{ requiredSchema: '{"response": "string", "emotion": "string"}' }
		);

		assert.deepEqual(result, { response: 'Hello', emotion: 'happy' });
		assert.match(capturedPrompt, /PREVIOUS FAILED OUTPUT/);
		assert.match(capturedPrompt, /\{"response":/);
		assert.match(capturedPrompt, /"emotion": "string"/);
	} finally {
		llmService.invokeStructuredLlm = originalInvokeStructuredLlm;
	}
});

test('invokeStructuredLlm logs structured parse failures without raw output content', async () => {
	const originalCreateLlmInstance = llmService.createLlmInstance;
	const originalValidateTokenCount = llmService.validateTokenCount;
	const originalWarn = flowLogger.warn;
	const warnings: Array<{ message: string; data?: Record<string, unknown> }> = [];
	llmService.validateTokenCount = (async () => undefined) as typeof llmService.validateTokenCount;
	llmService.createLlmInstance = (async () => ({
		invoke: async () => ({ content: '{"properNouns":' }),
	})) as unknown as typeof llmService.createLlmInstance;
	flowLogger.warn = ((_module, message, data) => {
		warnings.push({ message, data });
	}) as typeof flowLogger.warn;

	try {
		await assert.rejects(
			() =>
				llmService.invokeStructuredLlm(
					[],
					getAiModelInfo('openai/gpt-5.6-terra'),
					'test-user',
					z.object({ properNouns: z.array(z.string()) })
				),
			StructuredOutputValidationError
		);

		assert.equal(warnings.length, 1);
		assert.equal(warnings[0].message, 'structuredOutput.parseFailed');
		assert.equal(warnings[0].data?.reason, 'The model returned malformed JSON.');
		assert.equal(warnings[0].data?.rawOutputLength, 15);
		assert.equal(Object.hasOwn(warnings[0].data ?? {}, 'rawOutput'), false);
	} finally {
		llmService.createLlmInstance = originalCreateLlmInstance;
		llmService.validateTokenCount = originalValidateTokenCount;
		flowLogger.warn = originalWarn;
	}
});
