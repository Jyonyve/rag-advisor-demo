import type { FinancialSessionProfile, LoreInfo } from '@rag-advisor-demo/shared/domain';
import { financeLoreStructuredMetadataSchema } from '@rag-advisor-demo/shared/domain';

import { filterFinanceLore } from '../service/financeProductFilter.js';
import { DEMO_LORE_FIXTURES } from './domainFixtures.js';
import { FINANCE_CATALOG_FIXTURES } from './financeFixtures.js';

const financeLores = [
	DEMO_LORE_FIXTURES[0],
	...FINANCE_CATALOG_FIXTURES.map(({ lore }) => lore),
] as LoreInfo[];

export interface FinanceEvaluationCase {
	id: string;
	profile: FinancialSessionProfile;
	currentMessage: string;
	expectedEligibleProductFixtureIds: string[];
}

export const FINANCE_EVALUATION_CASES: readonly FinanceEvaluationCase[] = [
	{
		id: 'conservative-short-high-liquidity',
		profile: {
			domain: 'finance',
			investmentHorizonMonths: 12,
			liquidityNeed: 'high',
			riskPreference: 'conservative',
			constraints: [],
		},
		currentMessage: 'Compare eligible fictional demo products.',
		expectedEligibleProductFixtureIds: ['cedar-reserve-account'],
	},
	{
		id: 'moderate-three-year',
		profile: {
			domain: 'finance',
			investmentHorizonMonths: 36,
			liquidityNeed: 'medium',
			riskPreference: 'moderate',
			constraints: [],
		},
		currentMessage: 'Compare eligible fictional demo products.',
		expectedEligibleProductFixtureIds: ['cedar-reserve-account', 'harbor-income-note'],
	},
	{
		id: 'growth-five-year',
		profile: {
			domain: 'finance',
			investmentHorizonMonths: 60,
			liquidityNeed: 'low',
			riskPreference: 'growth',
			constraints: [],
		},
		currentMessage: 'Compare eligible fictional demo products.',
		expectedEligibleProductFixtureIds: [
			'cedar-reserve-account',
			'harbor-income-note',
			'summit-growth-portfolio',
		],
	},
	{
		id: 'temporary-six-month-override',
		profile: {
			domain: 'finance',
			investmentHorizonMonths: 60,
			liquidityNeed: 'low',
			riskPreference: 'growth',
			constraints: [],
		},
		currentMessage: 'Assume I need the money in 6 months for this answer only.',
		expectedEligibleProductFixtureIds: ['cedar-reserve-account'],
	},
] as const;

const getEligibleProductFixtureIds = (lores: readonly LoreInfo[]): string[] =>
	lores
		.filter((lore) => {
			const metadata = financeLoreStructuredMetadataSchema.safeParse(lore.structuredMetadata);
			return metadata.success && metadata.data.knowledgeType === 'product';
		})
		.map(({ fixtureId }) => fixtureId!)
		.sort();

export const evaluateFinanceFixtures = () => {
	const cases = FINANCE_EVALUATION_CASES.map((evaluationCase) => {
		const result = filterFinanceLore(
			financeLores,
			evaluationCase.profile,
			evaluationCase.currentMessage
		);
		const actualEligibleProductFixtureIds = getEligibleProductFixtureIds(result.eligibleLore);
		const expectedEligibleProductFixtureIds = [
			...evaluationCase.expectedEligibleProductFixtureIds,
		].sort();
		return {
			id: evaluationCase.id,
			passed:
				JSON.stringify(actualEligibleProductFixtureIds) ===
				JSON.stringify(expectedEligibleProductFixtureIds),
			expectedEligibleProductFixtureIds,
			actualEligibleProductFixtureIds,
			temporaryAssumptions: result.assumptions,
		};
	});
	return {
		mode: 'deterministic-local-evaluation',
		providerCallsAttempted: false,
		databaseConnectionAttempted: false,
		passed: cases.every(({ passed }) => passed),
		cases,
	};
};

const isDirectExecution = process.argv[1]?.endsWith('financeEvaluation.ts');
if (isDirectExecution) {
	const report = evaluateFinanceFixtures();
	process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
	if (!report.passed) process.exitCode = 1;
}
