import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { HealthcareOperationsSeedPlan } from './healthcareOperationsFixtureSeed.js';
import { buildHealthcareOperationsLiveSmokePlan } from './healthcareOperationsLiveSmoke.js';

const readySeedPlan = (): HealthcareOperationsSeedPlan => ({
	mode: 'dry-run',
	dataVersion: 'test',
	safety: {
		databaseInspectionPerformed: true,
		databaseWritesAttempted: false,
		embeddingProviderCallsAttempted: false,
		llmProviderCallsAttempted: false,
	},
	ownerResolution: { localUserCount: 1, resolvedSingleOwner: true, explicitOwnerRequested: true },
	databaseInspection: {
		totalRecordCounts: { characters: 2, lores: 13, memoryEmbeddings: 13 },
		targetRecordCounts: { characters: 1, lores: 6, memoryEmbeddings: 6 },
	},
	plannedOperations: {
		characters: { inserts: [], updates: [], unchanged: ['healthcare-operations-assistant_demo'] },
		lores: { inserts: [], updates: [], unchanged: ['six-ready-lores'] },
		documents: { inserts: [], updates: [], unchanged: [] },
	},
	plannedEmbeddings: {
		sourceIds: ['six-ready-lores'],
		providerCallSourceIds: [],
		metadataRefreshSourceIds: [],
		unchangedSourceIds: ['six-ready-lores'],
		maximumProviderCalls: 0,
	},
	stableIdCollisions: [],
	validationFailures: [],
});

test('healthcare live smoke defaults to a no-write, no-provider plan', () => {
	const plan = buildHealthcareOperationsLiveSmokePlan(readySeedPlan(), {}, 'local-demo-owner', true);

	assert.equal(plan.mode, 'dry-run');
	assert.equal(plan.safety.databaseWritesAttempted, false);
	assert.equal(plan.safety.embeddingProviderCallsAttempted, false);
	assert.equal(plan.safety.llmProviderCallsAttempted, false);
	assert.deepEqual(plan.plannedWrites, {
		sessionInsert: true,
		profileInsert: true,
		tempChatTurnInsert: true,
	});
	assert.equal(plan.plannedProviderCalls.maximumQueryEmbeddingCalls, 8);
	assert.equal(plan.plannedProviderCalls.maximumLlmCalls, 4);
	assert.deepEqual(plan.validationFailures, []);
});

test('healthcare live smoke blocks without an owner or embedding credential', () => {
	const plan = buildHealthcareOperationsLiveSmokePlan(readySeedPlan(), {}, undefined, false);

	assert.deepEqual(
		plan.validationFailures.map(({ code }) => code),
		['OWNER_UNRESOLVED', 'OPENAI_ENVIRONMENT_KEY_NOT_CONFIGURED']
	);
});
