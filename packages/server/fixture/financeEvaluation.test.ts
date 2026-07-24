import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateFinanceFixtures } from './financeEvaluation.js';

test('all fixed finance suitability evaluations pass without database or providers', () => {
	const report = evaluateFinanceFixtures();

	assert.equal(report.passed, true);
	assert.equal(report.providerCallsAttempted, false);
	assert.equal(report.databaseConnectionAttempted, false);
	assert.equal(report.cases.length, 4);
	assert.ok(report.cases.every(({ passed }) => passed));
});
