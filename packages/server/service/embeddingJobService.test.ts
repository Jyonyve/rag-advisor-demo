import assert from 'node:assert/strict';
import test from 'node:test';
import { createEmbeddingJobService } from './embeddingJobService.js';
import { ReplaceMemoryEmbeddingInput } from './embeddingService.js';

const waitForTerminalStatus = async (
	service: ReturnType<typeof createEmbeddingJobService>,
	input: Pick<ReplaceMemoryEmbeddingInput, 'sourceType' | 'sourceId'>
) => {
	const deadline = Date.now() + 2_000;
	do {
		const job = service.get(input);
		if (job?.status === 'completed' || job?.status === 'failed') return job;
		await new Promise((resolve) => setTimeout(resolve, 10));
	} while (Date.now() < deadline);
	throw new Error(`Embedding job ${input.sourceType}:${input.sourceId} did not finish.`);
};

const testInput: ReplaceMemoryEmbeddingInput = {
	sourceType: 'chat',
	sourceId: 'chat-1',
	userId: 'user-1',
	characterId: 'character-1',
	sessionId: 'session-1',
	content: 'hello',
	metadata: { topic: 'test' },
};

test('embedding job service deduplicates replacement work by source', async () => {
	const processedInputs: ReplaceMemoryEmbeddingInput[] = [];
	const service = createEmbeddingJobService(async (input) => {
		processedInputs.push(input);
	});

	const first = service.enqueue(testInput);
	const second = service.enqueue({ ...testInput });
	const completed = await waitForTerminalStatus(service, testInput);

	assert.equal(first.jobId, second.jobId);
	assert.equal(processedInputs.length, 1);
	assert.equal(processedInputs[0].content, 'hello');
	assert.equal(completed.status, 'completed');
	assert.deepEqual(completed.result, { sourceType: 'chat', sourceId: 'chat-1' });
});

test('embedding job service schedules changed source content as a new job', async () => {
	const processedInputs: ReplaceMemoryEmbeddingInput[] = [];
	const service = createEmbeddingJobService(async (input) => {
		processedInputs.push(input);
	});

	const first = service.enqueue(testInput);
	const secondInput = { ...testInput, content: 'newer content' };
	const second = service.enqueue(secondInput);
	const completed = await waitForTerminalStatus(service, secondInput);

	assert.notEqual(first.jobId, second.jobId);
	assert.equal(completed.status, 'completed');
	assert.deepEqual(
		processedInputs.map((input) => input.content),
		['hello', 'newer content']
	);
});

test('embedding job service retries failed replacements', async () => {
	let attempts = 0;
	const service = createEmbeddingJobService(async () => {
		attempts += 1;
		if (attempts < 2) throw new Error('temporary embedding failure');
	});

	service.enqueue(testInput);
	const completed = await waitForTerminalStatus(service, testInput);

	assert.equal(completed.status, 'completed');
	assert.equal(completed.attempts, 2);
	assert.equal(attempts, 2);
});
