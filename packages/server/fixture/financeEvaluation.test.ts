import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateFinanceFixtures, FINANCE_EVALUATION_CASES } from './financeEvaluation.js';

test('all fixed finance suitability evaluations pass without database or providers', () => {
	const report = evaluateFinanceFixtures();

	assert.equal(report.passed, true);
	assert.equal(report.providerCallsAttempted, false);
	assert.equal(report.databaseConnectionAttempted, false);
	assert.equal(report.cases.length, FINANCE_EVALUATION_CASES.length);
	assert.ok(report.cases.every(({ passed }) => passed));
});
