import assert from 'node:assert/strict';
import test from 'node:test';
import { getPublicSignupDenial } from './publicSignupPolicy.js';

test('public demo mode blocks ordinary email and password signup', () => {
	assert.deepEqual(getPublicSignupDenial(true), {
		status: 'SIGN_UP_NOT_ALLOWED',
		reason: 'Public account registration is disabled. Use Try Demo instead.',
	});
});

test('non-public deployments retain ordinary signup', () => {
	assert.equal(getPublicSignupDenial(false), undefined);
});
