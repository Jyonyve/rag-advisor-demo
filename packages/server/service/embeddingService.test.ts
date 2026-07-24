import assert from 'node:assert/strict';
import test from 'node:test';
import { createQueryEmbeddingCache, resolveQueryEmbedding } from './embeddingService.js';

test('query embedding cache shares concurrent work for identical text', async () => {
	const cache = createQueryEmbeddingCache();
	let callCount = 0;
	const embedder = async (input: string): Promise<number[]> => {
		callCount += 1;
		await Promise.resolve();
		return [input.length];
	};

	const [first, second] = await Promise.all([
		resolveQueryEmbedding('same query', cache, embedder),
		resolveQueryEmbedding('same query', cache, embedder),
	]);

	assert.equal(callCount, 1);
	assert.deepEqual(first, [10]);
	assert.strictEqual(first, second);
});

test('query embedding caches remain isolated between requests and texts', async () => {
	const firstRequest = createQueryEmbeddingCache();
	const secondRequest = createQueryEmbeddingCache();
	let callCount = 0;
	const embedder = async (input: string): Promise<number[]> => {
		callCount += 1;
		return [input.length];
	};

	await resolveQueryEmbedding('first', firstRequest, embedder);
	await resolveQueryEmbedding('second', firstRequest, embedder);
	await resolveQueryEmbedding('first', secondRequest, embedder);

	assert.equal(callCount, 3);
});

test('failed query embeddings are evicted so a request can retry', async () => {
	const cache = createQueryEmbeddingCache();
	let callCount = 0;
	const embedder = async (): Promise<number[]> => {
		callCount += 1;
		if (callCount === 1) throw new Error('temporary failure');
		return [1];
	};

	await assert.rejects(() => resolveQueryEmbedding('retry', cache, embedder));
	assert.deepEqual(await resolveQueryEmbedding('retry', cache, embedder), [1]);
	assert.equal(callCount, 2);
});
