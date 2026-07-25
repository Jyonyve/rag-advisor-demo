import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildHealthcareOperationsPreflightReport } from './healthcareOperationsPreflight.js';

test('healthcare operations preflight is deterministic and performs no external operations', () => {
	const first = buildHealthcareOperationsPreflightReport();
	const second = buildHealthcareOperationsPreflightReport();

	assert.deepEqual(first, second);
	assert.equal(first.safety.databaseConnectionAttempted, false);
	assert.equal(first.safety.databaseWritesAttempted, false);
	assert.equal(first.safety.embeddingProviderCallsAttempted, false);
	assert.equal(first.safety.llmProviderCallsAttempted, false);
	assert.deepEqual(first.plannedOperations.characterUpserts, [
		'healthcare-operations-assistant_demo',
	]);
	assert.equal(first.plannedOperations.loreUpserts.length, 6);
	assert.equal(first.plannedEmbeddings.maximumProviderCallsIfNoExistingHashesMatch, 6);
	assert.deepEqual(first.localStableIdCollisions, []);
	assert.deepEqual(first.validationFailures, []);
});
