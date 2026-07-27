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
		currentMessage: '수익률보다 안정성을 우선하면 어떤 상품이 맞나요?',
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
		currentMessage: '3년 정도 모을 생각인데 예금과 펀드 중 뭐가 나을까요?',
		expectedEligibleProductFixtureIds: [
			'cedar-reserve-account',
			'saebom-six-month-deposit',
			'daeon-one-year-savings',
			'harbor-income-note',
			'ongyeol-short-bond-portfolio',
			'hanul-balanced-portfolio',
		],
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
		currentMessage: '장기적으로 자산을 늘리고 싶은데 포트폴리오를 구성해 주세요.',
		expectedEligibleProductFixtureIds: [
			'cedar-reserve-account',
			'saebom-six-month-deposit',
			'daeon-one-year-savings',
			'harbor-income-note',
			'ongyeol-short-bond-portfolio',
			'hanul-balanced-portfolio',
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
		currentMessage:
			'제 투자성향은 그대로 두고, 이번에는 6개월짜리 단기 자금이라고 가정해 주세요. 이건 프로필에 저장하지 마세요.',
		expectedEligibleProductFixtureIds: ['cedar-reserve-account', 'saebom-six-month-deposit'],
	},
	{
		id: 'temporary-one-year-moving-cost',
		profile: {
			domain: 'finance',
			investmentHorizonMonths: 60,
			liquidityNeed: 'low',
			riskPreference: 'growth',
			constraints: [],
		},
		currentMessage:
			'만약 이 돈을 1년 뒤 이사 비용으로 써야 한다면 뭘 추천할래요? 이 조건은 저장하지 마세요.',
		expectedEligibleProductFixtureIds: [
			'cedar-reserve-account',
			'saebom-six-month-deposit',
			'daeon-one-year-savings',
		],
	},
	{
		id: 'temporary-principal-loss-avoidance',
		profile: {
			domain: 'finance',
			investmentHorizonMonths: 60,
			liquidityNeed: 'low',
			riskPreference: 'growth',
			constraints: [],
		},
		currentMessage: '평소에는 공격적으로 투자하지만, 이번 돈만큼은 원금 손실을 피하고 싶어요.',
		expectedEligibleProductFixtureIds: [
			'cedar-reserve-account',
			'saebom-six-month-deposit',
			'daeon-one-year-savings',
			'harbor-income-note',
			'ongyeol-short-bond-portfolio',
		],
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
