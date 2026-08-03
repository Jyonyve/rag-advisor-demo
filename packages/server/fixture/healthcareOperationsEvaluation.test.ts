import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
	evaluateHealthcareOperationsFixtures,
	HEALTHCARE_OPERATIONS_EVALUATION_CASES,
} from './healthcareOperationsEvaluation.js';
import { HEALTHCARE_OPERATIONS_FIXTURES } from './healthcareOperationsFixtures.js';

test('all fixed healthcare operations evaluations pass without database or providers', () => {
	const report = evaluateHealthcareOperationsFixtures();

	assert.equal(HEALTHCARE_OPERATIONS_EVALUATION_CASES.length, 4);
	assert.equal(report.passed, true);
	assert.equal(report.providerCallsAttempted, false);
	assert.equal(report.databaseConnectionAttempted, false);
	assert.ok(report.cases.every(({ canonicalProfileUnchanged }) => canonicalProfileUnchanged));
});

test('healthcare workflow fixtures provide Korean canonical bodies with bilingual retrieval terms', () => {
	for (const { lore } of HEALTHCARE_OPERATIONS_FIXTURES) {
		assert.match(lore.content, /[가-힣]/);
		assert.match(lore.summary, /[가-힣]/);
		assert.ok(lore.keywordList.some((keyword) => /[가-힣]/.test(keyword)));
		assert.ok(lore.keywordList.some((keyword) => /[A-Za-z]/.test(keyword)));
	}
});
