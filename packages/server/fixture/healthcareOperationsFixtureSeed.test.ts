import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
	buildHealthcareOperationsSeedPlan,
	type HealthcareOperationsDatabaseSnapshot,
} from './healthcareOperationsFixtureSeed.js';

const emptySnapshot = (
	overrides: Partial<HealthcareOperationsDatabaseSnapshot> = {}
): HealthcareOperationsDatabaseSnapshot => ({
	localUserIds: ['local-demo-user'],
	totalRecordCounts: { characters: 0, lores: 0, memoryEmbeddings: 0 },
	characters: [],
	lores: [],
	embeddings: [],
	...overrides,
});

test('database-aware healthcare planning defaults to inserts and provider calls', () => {
	const plan = buildHealthcareOperationsSeedPlan(emptySnapshot());

	assert.equal(plan.mode, 'dry-run');
	assert.equal(plan.safety.databaseWritesAttempted, false);
	assert.equal(plan.safety.embeddingProviderCallsAttempted, false);
	assert.deepEqual(plan.plannedOperations.characters.inserts, [
		'healthcare-operations-assistant_demo',
	]);
	assert.equal(plan.plannedOperations.lores.inserts.length, 6);
	assert.equal(plan.plannedEmbeddings.providerCallSourceIds.length, 6);
	assert.equal(plan.plannedEmbeddings.maximumProviderCalls, 6);
	assert.deepEqual(plan.validationFailures, []);
});

test('database-aware healthcare planning requires one resolved owner', () => {
	const noUser = buildHealthcareOperationsSeedPlan(emptySnapshot({ localUserIds: [] }));
	const ambiguous = buildHealthcareOperationsSeedPlan(
		emptySnapshot({ localUserIds: ['local-demo-user', 'other-demo-user'] })
	);
	const explicit = buildHealthcareOperationsSeedPlan(
		emptySnapshot({ localUserIds: ['local-demo-user', 'other-demo-user'] }),
		'other-demo-user'
	);

	assert.equal(noUser.validationFailures.at(-1)?.code, 'NO_LOCAL_USER');
	assert.equal(ambiguous.validationFailures.at(-1)?.code, 'AMBIGUOUS_LOCAL_USERS');
	assert.equal(explicit.validationFailures.length, 0);
	assert.equal(explicit.ownerResolution.resolvedSingleOwner, true);
});

test('database-aware healthcare planning blocks stable IDs owned by another user', () => {
	const plan = buildHealthcareOperationsSeedPlan(
		emptySnapshot({
			characters: [
				{
					characterId: 'healthcare-operations-assistant_demo',
					userId: 'other-user',
					data: {} as HealthcareOperationsDatabaseSnapshot['characters'][number]['data'],
				},
			],
		})
	);

	assert.deepEqual(plan.stableIdCollisions, ['healthcare-operations-assistant_demo']);
	assert.equal(plan.validationFailures.at(-1)?.code, 'STABLE_ID_COLLISION');
});
