import assert from 'node:assert/strict';
import test from 'node:test';
import { isPublicDemoMode } from './publicDemoUtils.js';

test('public demo runtime hides browser authentication routes', () => {
	assert.equal(isPublicDemoMode({ __PUBLIC_DEMO_MODE__: true }), true);
});

test('missing or false public demo runtime keeps browser authentication routes', () => {
	assert.equal(isPublicDemoMode({ __PUBLIC_DEMO_MODE__: false }), false);
	assert.equal(isPublicDemoMode(undefined), false);
});
