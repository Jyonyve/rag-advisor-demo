import type { HealthcareOperationsSessionProfile, LoreInfo } from '@rag-advisor-demo/shared/domain';

import { filterHealthcareOperationsLore } from '../service/healthcareOperationsFilter.js';
import { DEMO_LORE_FIXTURES } from './domainFixtures.js';
import { HEALTHCARE_OPERATIONS_FIXTURES } from './healthcareOperationsFixtures.js';

const healthcareLores = [
	DEMO_LORE_FIXTURES[1],
	...HEALTHCARE_OPERATIONS_FIXTURES.map(({ lore }) => lore),
] as LoreInfo[];

export interface HealthcareOperationsEvaluationCase {
	id: string;
	profile: HealthcareOperationsSessionProfile;
	currentMessage: string;
	expectedEligibleFixtureIds: string[];
}

export const HEALTHCARE_OPERATIONS_EVALUATION_CASES: readonly HealthcareOperationsEvaluationCase[] =
	[
		{
			id: 'admin-billing-inquiry',
			profile: {
				domain: 'healthcare_operations',
				workflowTopic: 'Billing inquiry',
				requesterRole: 'admin_staff',
				urgency: 'routine',
				constraints: [],
			},
			currentMessage: 'Show the fictional routine billing inquiry workflow.',
			expectedEligibleFixtureIds: [
				'healthcare-operations-assistant-core',
				'northstar-billing-inquiry',
			],
		},
		{
			id: 'patient-support-record-copy',
			profile: {
				domain: 'healthcare_operations',
				workflowTopic: 'Record copy and privacy',
				requesterRole: 'patient_support',
				urgency: 'time_sensitive',
				constraints: [],
			},
			currentMessage: 'Explain the time-sensitive record copy and privacy procedure.',
			expectedEligibleFixtureIds: [
				'healthcare-operations-assistant-core',
				'northstar-record-copy-and-privacy',
			],
		},
		{
			id: 'doctor-admission-discharge',
			profile: {
				domain: 'healthcare_operations',
				workflowTopic: 'Admission and discharge administration',
				requesterRole: 'doctor',
				urgency: 'time_sensitive',
				constraints: [],
			},
			currentMessage: 'Show the time-sensitive admission and discharge administrative steps.',
			expectedEligibleFixtureIds: [
				'healthcare-operations-assistant-core',
				'northstar-admission-discharge-administration',
			],
		},
		{
			id: 'korean-patient-support-admission-discharge',
			profile: {
				domain: 'healthcare_operations',
				workflowTopic: 'Billing inquiry',
				requesterRole: 'patient_support',
				urgency: 'routine',
				constraints: [],
			},
			currentMessage: '입원 및 퇴원 행정 절차를 정리해 주세요.',
			expectedEligibleFixtureIds: [
				'healthcare-operations-assistant-core',
				'northstar-admission-discharge-administration',
			],
		},
	] as const;

export const evaluateHealthcareOperationsFixtures = () => {
	const cases = HEALTHCARE_OPERATIONS_EVALUATION_CASES.map((evaluationCase) => {
		const profileBefore = JSON.stringify(evaluationCase.profile);
		const result = filterHealthcareOperationsLore(
			healthcareLores,
			evaluationCase.profile,
			evaluationCase.currentMessage
		);
		const actualEligibleFixtureIds = result.eligibleLore.map(({ fixtureId }) => fixtureId!).sort();
		const expectedEligibleFixtureIds = [...evaluationCase.expectedEligibleFixtureIds].sort();
		return {
			id: evaluationCase.id,
			passed:
				JSON.stringify(actualEligibleFixtureIds) === JSON.stringify(expectedEligibleFixtureIds) &&
				JSON.stringify(evaluationCase.profile) === profileBefore,
			expectedEligibleFixtureIds,
			actualEligibleFixtureIds,
			temporaryAssumptions: result.assumptions,
			canonicalProfileUnchanged: JSON.stringify(evaluationCase.profile) === profileBefore,
		};
	});
	return {
		mode: 'deterministic-local-evaluation',
		domain: 'healthcare_operations',
		providerCallsAttempted: false,
		databaseConnectionAttempted: false,
		passed: cases.every(({ passed }) => passed),
		cases,
	};
};

const isDirectExecution = process.argv[1]?.endsWith('healthcareOperationsEvaluation.ts');
if (isDirectExecution) {
	const report = evaluateHealthcareOperationsFixtures();
	process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
	if (!report.passed) process.exitCode = 1;
}
