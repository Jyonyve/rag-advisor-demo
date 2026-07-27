import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
	buildFinanceFixtureSeedPlan,
	type FinanceFixtureDatabaseSnapshot,
} from './financeFixtureSeed.js';

const emptySnapshot = (
	overrides: Partial<FinanceFixtureDatabaseSnapshot> = {}
): FinanceFixtureDatabaseSnapshot => ({
	localUserIds: ['local-demo-user'],
	totalRecordCounts: { characters: 0, lores: 0, memoryEmbeddings: 0 },
	characters: [],
	lores: [],
	embeddings: [],
	...overrides,
});

test('database-aware finance fixture planning defaults to inserts and provider calls', () => {
	const plan = buildFinanceFixtureSeedPlan(emptySnapshot());

	assert.equal(plan.mode, 'dry-run');
	assert.equal(plan.safety.databaseWritesAttempted, false);
	assert.equal(plan.safety.embeddingProviderCallsAttempted, false);
	assert.equal(plan.ownerResolution.resolvedSingleOwner, true);
	assert.deepEqual(plan.plannedOperations.characters.inserts, ['finance-assistant_demo']);
	assert.equal(plan.plannedOperations.lores.inserts.length, 20);
	assert.equal(plan.plannedEmbeddings.providerCallSourceIds.length, 20);
	assert.equal(plan.plannedEmbeddings.maximumProviderCalls, 20);
	assert.deepEqual(plan.validationFailures, []);
});

test('database-aware finance fixture planning blocks without exactly one local user', () => {
	const noUserPlan = buildFinanceFixtureSeedPlan(emptySnapshot({ localUserIds: [] }));
	const ambiguousPlan = buildFinanceFixtureSeedPlan(
		emptySnapshot({ localUserIds: ['local-demo-user', 'second-demo-user'] })
	);

	assert.equal(noUserPlan.validationFailures.at(-1)?.code, 'NO_LOCAL_USER');
	assert.equal(ambiguousPlan.validationFailures.at(-1)?.code, 'AMBIGUOUS_LOCAL_USERS');
	assert.equal(noUserPlan.plannedEmbeddings.maximumProviderCalls, 0);
});

test('database-aware finance fixture planning accepts an explicit existing owner', () => {
	const plan = buildFinanceFixtureSeedPlan(
		emptySnapshot({ localUserIds: ['local-demo-user', 'second-demo-user'] }),
		'second-demo-user'
	);

	assert.equal(plan.ownerResolution.resolvedSingleOwner, true);
	assert.equal(plan.ownerResolution.explicitOwnerRequested, true);
	assert.deepEqual(plan.plannedOperations.characters.inserts, ['finance-assistant_demo']);
	assert.equal(plan.validationFailures.length, 0);
});

test('database-aware finance fixture planning rejects an unknown explicit owner', () => {
	const plan = buildFinanceFixtureSeedPlan(emptySnapshot(), 'unknown-demo-user');

	assert.equal(plan.ownerResolution.resolvedSingleOwner, false);
	assert.equal(plan.validationFailures.at(-1)?.code, 'UNKNOWN_LOCAL_USER');
});

test('database-aware finance fixture planning blocks stable IDs owned by another user', () => {
	const plan = buildFinanceFixtureSeedPlan(
		emptySnapshot({
			characters: [
				{
					characterId: 'finance-assistant_demo',
					userId: 'other-user',
					data: {} as FinanceFixtureDatabaseSnapshot['characters'][number]['data'],
				},
			],
		})
	);

	assert.deepEqual(plan.stableIdCollisions, ['finance-assistant_demo']);
	assert.equal(plan.validationFailures.at(-1)?.code, 'STABLE_ID_COLLISION');
});

test('database-aware finance fixture planning rejects duplicate active embeddings', () => {
	const embedding = {
		sourceId: 'finance-assistant-core_demo-lore',
		userId: 'local-demo-user',
		characterId: 'finance-assistant_demo',
		contentHash: 'stale',
		metadata: {},
		active: true,
	};
	const plan = buildFinanceFixtureSeedPlan(
		emptySnapshot({ embeddings: [embedding, { ...embedding, contentHash: 'also-stale' }] })
	);

	assert.ok(plan.stableIdCollisions.includes('lore-embedding:finance-assistant-core_demo-lore'));
	assert.equal(plan.validationFailures.at(-1)?.code, 'STABLE_ID_COLLISION');
});
