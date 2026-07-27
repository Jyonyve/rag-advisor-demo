import assert from 'node:assert/strict';
import test from 'node:test';

import type { FinancialSessionProfile, LoreInfo } from '@rag-advisor-demo/shared/domain';

import { DEMO_LORE_FIXTURES } from '../fixture/domainFixtures.js';
import { FINANCE_CATALOG_FIXTURES } from '../fixture/financeFixtures.js';
import { analyzeFinanceRequestOverrides, filterFinanceLore } from './financeProductFilter.js';

const financeLores = [
	DEMO_LORE_FIXTURES[0],
	...FINANCE_CATALOG_FIXTURES.map(({ lore }) => lore),
] as LoreInfo[];

const conservativeProfile: FinancialSessionProfile = {
	domain: 'finance',
	investmentHorizonMonths: 12,
	liquidityNeed: 'high',
	riskPreference: 'conservative',
	constraints: [],
};

test('finance filtering retains compatible products and their disclosures', () => {
	const result = filterFinanceLore(financeLores, conservativeProfile, 'Compare the demo products.');

	assert.deepEqual(
		result.eligibleLore.map(({ fixtureId }) => fixtureId),
		['finance-assistant-core', 'cedar-reserve-account', 'cedar-reserve-account-disclosure']
	);
	assert.deepEqual(
		result.decisions
			.filter(({ decision }) => decision === 'excluded')
			.map(({ sourceId }) => sourceId),
		[
			'harbor-income-note_demo-lore',
			'summit-growth-portfolio_demo-lore',
			'harbor-income-note-disclosure_demo-lore',
			'summit-growth-portfolio-disclosure_demo-lore',
		]
	);
});

test('current-request horizon overrides the canonical profile without mutation', () => {
	const profile: FinancialSessionProfile = {
		...conservativeProfile,
		investmentHorizonMonths: 60,
		liquidityNeed: 'low',
		riskPreference: 'growth',
	};
	const result = filterFinanceLore(
		financeLores,
		profile,
		'Assume I need the money in 6 months for this answer.'
	);

	assert.equal(result.requestOverrides.investmentHorizonMonths, 6);
	assert.equal(profile.investmentHorizonMonths, 60);
	assert.ok(
		result.decisions
			.find(({ sourceId }) => sourceId === 'summit-growth-portfolio_demo-lore')
			?.reasons.includes('horizon_mismatch')
	);
	assert.deepEqual(result.assumptions, [
		{ source: 'current_request', description: 'Temporary investment horizon: 6 months.' },
	]);
});

test('request override analysis recognizes bounded English and Korean horizon forms', () => {
	assert.deepEqual(analyzeFinanceRequestOverrides('If the horizon is 3 years'), {
		investmentHorizonMonths: 36,
		liquidityNeed: undefined,
		riskPreference: undefined,
	});
	assert.equal(
		analyzeFinanceRequestOverrides('투자 기간은 9개월로 가정').investmentHorizonMonths,
		9
	);
});

test('product-term questions are not misclassified as personal request overrides', () => {
	assert.deepEqual(
		analyzeFinanceRequestOverrides(
			'Does the fictional 누리 3년 정기예금 require a 3 year horizon and have medium liquidity?'
		),
		{ investmentHorizonMonths: undefined, liquidityNeed: undefined, riskPreference: undefined }
	);
});

test('finance filtering rejects malformed product metadata', () => {
	const malformed = {
		...FINANCE_CATALOG_FIXTURES[0].lore,
		loreId: 'malformed-product_demo-lore',
		structuredMetadata: { domain: 'finance', knowledgeType: 'product' },
	} as LoreInfo;
	const result = filterFinanceLore([malformed], conservativeProfile, 'Compare.');

	assert.deepEqual(result.eligibleLore, []);
	assert.deepEqual(result.decisions[0]?.reasons, ['invalid_structured_metadata']);
});
