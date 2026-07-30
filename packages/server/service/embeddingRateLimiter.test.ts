import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '@rag-advisor-demo/shared/domain';
import { createEmbeddingRateLimiter } from './embeddingRateLimiter.js';

test('embedding rate limiter isolates users and resets each window', () => {
	let currentTime = 1_000;
	const limiter = createEmbeddingRateLimiter({
		maxCalls: 2,
		windowMs: 1_000,
		now: () => currentTime,
	});

	limiter.consume('user-a');
	limiter.consume('user-a');
	limiter.consume('user-b');

	assert.throws(
		() => limiter.consume('user-a'),
		(error: unknown) => error instanceof ApiError && error.status === 429
	);

	currentTime += 1_000;
	assert.doesNotThrow(() => limiter.consume('user-a'));
});

test('embedding rate limiter rejects calls without an authenticated user', () => {
	const limiter = createEmbeddingRateLimiter({ maxCalls: 1 });
	assert.throws(
		() => limiter.consume(' '),
		(error: unknown) => error instanceof ApiError && error.status === 401
	);
});
