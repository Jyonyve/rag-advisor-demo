import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { HealthcareOperationsSessionProfile, LoreInfo } from '@rag-advisor-demo/shared/domain';

import { DEMO_LORE_FIXTURES } from '../fixture/domainFixtures.js';
import { HEALTHCARE_OPERATIONS_FIXTURES } from '../fixture/healthcareOperationsFixtures.js';
import {
	analyzeHealthcareOperationsRequestOverrides,
	filterHealthcareOperationsLore,
} from './healthcareOperationsFilter.js';

const healthcareLores = [
	DEMO_LORE_FIXTURES[1],
	...HEALTHCARE_OPERATIONS_FIXTURES.map(({ lore }) => lore),
] as LoreInfo[];

const profile = (
	overrides: Partial<HealthcareOperationsSessionProfile> = {}
): HealthcareOperationsSessionProfile => ({
	domain: 'healthcare_operations',
	requesterRole: 'admin_staff',
	urgency: 'routine',
	constraints: [],
	...overrides,
});

test('healthcare filtering keeps the general guide and role-appropriate requested workflow', () => {
	const result = filterHealthcareOperationsLore(
		healthcareLores,
		profile(),
		'How should I handle a routine billing inquiry?'
	);

	assert.deepEqual(
		result.eligibleLore.map(({ fixtureId }) => fixtureId),
		['healthcare-operations-assistant-core', 'northstar-billing-inquiry']
	);
	assert.ok(
		result.decisions.some(
			({ sourceId, reasons }) =>
				sourceId === 'northstar-his-access_demo-lore' && reasons.includes('workflow_topic_mismatch')
		)
	);
});

test('Korean admission and discharge prompt remains eligible for patient support', () => {
	const result = filterHealthcareOperationsLore(
		healthcareLores,
		profile({ requesterRole: 'patient_support' }),
		'입원 및 퇴원 행정 절차를 정리해 주세요.'
	);

	assert.deepEqual(
		result.eligibleLore.map(({ fixtureId }) => fixtureId),
		['healthcare-operations-assistant-core', 'northstar-admission-discharge-administration']
	);
	assert.equal(result.requestOverrides.workflowTopic, 'admission_discharge');
});

test('explicit requester-role overrides are temporary and do not mutate the profile', () => {
	const canonicalProfile = profile({ requesterRole: 'patient_support' });
	const message = 'For this answer, assume I am a nurse and explain HIS account access.';
	const overrides = analyzeHealthcareOperationsRequestOverrides(message);
	const result = filterHealthcareOperationsLore(healthcareLores, canonicalProfile, message);

	assert.equal(overrides.requesterRole, 'nurse');
	assert.equal(canonicalProfile.requesterRole, 'patient_support');
	assert.deepEqual(
		result.eligibleLore.map(({ fixtureId }) => fixtureId),
		['healthcare-operations-assistant-core', 'northstar-his-access']
	);
	assert.ok(
		result.assumptions.some(({ description }) =>
			description.includes('Temporary requester role: nurse')
		)
	);
});
