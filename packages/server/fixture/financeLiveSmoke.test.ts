import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { FinanceFixtureSeedPlan } from './financeFixtureSeed.js';
import { buildFinanceLiveSmokePlan } from './financeLiveSmoke.js';

const readyFixturePlan = (): FinanceFixtureSeedPlan => ({
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
		totalRecordCounts: { characters: 1, lores: 7, memoryEmbeddings: 7 },
		targetRecordCounts: { characters: 1, lores: 7, memoryEmbeddings: 7 },
	},
	plannedOperations: {
		characters: { inserts: [], updates: [], unchanged: ['finance-assistant_demo'] },
		lores: { inserts: [], updates: [], unchanged: ['seven-ready-lores'] },
		documents: { inserts: [], updates: [], unchanged: [] },
	},
	plannedEmbeddings: {
		sourceIds: ['seven-ready-lores'],
		providerCallSourceIds: [],
		metadataRefreshSourceIds: [],
		unchangedSourceIds: ['seven-ready-lores'],
		maximumProviderCalls: 0,
	},
	stableIdCollisions: [],
	validationFailures: [],
});

test('finance live smoke defaults to a no-write, no-provider plan', () => {
	const plan = buildFinanceLiveSmokePlan(
		readyFixturePlan(),
		{ reports: [] },
		'local-demo-owner',
		true
	);

	assert.equal(plan.mode, 'dry-run');
	assert.equal(plan.safety.databaseWritesAttempted, false);
	assert.equal(plan.safety.embeddingProviderCallsAttempted, false);
	assert.equal(plan.safety.llmProviderCallsAttempted, false);
	assert.deepEqual(plan.plannedWrites, {
		sessionInsert: true,
		profileInsert: true,
		tempChatTurnInsert: true,
		tempChatTurnDisclaimerUpdate: false,
		generatedReportInsert: true,
	});
	assert.equal(plan.plannedProviderCalls.maximumQueryEmbeddingCalls, 16);
	assert.equal(plan.plannedProviderCalls.maximumLlmCalls, 7);
	assert.deepEqual(plan.validationFailures, []);
});

test('finance live smoke blocks without an owner or embedding credential', () => {
	const plan = buildFinanceLiveSmokePlan(readyFixturePlan(), { reports: [] }, undefined, false);

	assert.deepEqual(
		plan.validationFailures.map(({ code }) => code),
		['OWNER_UNRESOLVED', 'OPENAI_ENVIRONMENT_KEY_NOT_CONFIGURED']
	);
});
