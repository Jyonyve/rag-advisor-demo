import assert from 'node:assert/strict';
import test from 'node:test';
import { isPublicDemoMode, reserveDemoUsageLocally } from './publicDemoUtils.js';

test('public demo runtime hides browser authentication routes', () => {
	assert.equal(isPublicDemoMode({ __PUBLIC_DEMO_MODE__: true }), true);
});

test('missing or false public demo runtime keeps browser authentication routes', () => {
	assert.equal(isPublicDemoMode({ __PUBLIC_DEMO_MODE__: false }), false);
	assert.equal(isPublicDemoMode(undefined), false);
});

test('optimistic demo reservations decrement only the submitted counter', () => {
	const usage = {
		chat: { used: 1, limit: 5, remaining: 4 },
		report: { used: 0, limit: 1, remaining: 1 },
		liveGenerationEnabled: true,
		mode: 'live' as const,
	};
	assert.deepEqual(reserveDemoUsageLocally(usage, 'chat'), {
		...usage,
		chat: { used: 2, limit: 5, remaining: 3 },
	});
	assert.deepEqual(reserveDemoUsageLocally(usage, 'report'), {
		...usage,
		report: { used: 1, limit: 1, remaining: 0 },
	});
});

test('optimistic demo reservations never make remaining usage negative', () => {
	const usage = {
		chat: { used: 5, limit: 5, remaining: 0 },
		report: { used: 1, limit: 1, remaining: 0 },
		liveGenerationEnabled: true,
		mode: 'live' as const,
	};
	assert.equal(reserveDemoUsageLocally(usage, 'chat'), usage);
});
