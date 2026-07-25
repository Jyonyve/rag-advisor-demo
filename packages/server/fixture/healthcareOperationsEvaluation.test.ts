import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
	evaluateHealthcareOperationsFixtures,
	HEALTHCARE_OPERATIONS_EVALUATION_CASES,
} from './healthcareOperationsEvaluation.js';

test('all fixed healthcare operations evaluations pass without database or providers', () => {
	const report = evaluateHealthcareOperationsFixtures();

	assert.equal(HEALTHCARE_OPERATIONS_EVALUATION_CASES.length, 3);
	assert.equal(report.passed, true);
	assert.equal(report.providerCallsAttempted, false);
	assert.equal(report.databaseConnectionAttempted, false);
	assert.ok(report.cases.every(({ canonicalProfileUnchanged }) => canonicalProfileUnchanged));
});
