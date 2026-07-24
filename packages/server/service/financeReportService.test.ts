import assert from 'node:assert/strict';
import test from 'node:test';

import type { MemoryResponse } from '@rag-advisor-demo/shared/api';
import type { RagEvidenceDto } from '@rag-advisor-demo/shared/domain';

import { FINANCE_CATALOG_FIXTURES } from '../fixture/financeFixtures.js';
import type { ResolvedRagContext } from './ragContextService.js';
import {
	buildFinanceReportMessages,
	financeReportOutputSchema,
	renderFinanceReportMarkdown,
	validateFinanceReportEvidence,
	type FinanceReportOutput,
} from './financeReportService.js';

const cedar = FINANCE_CATALOG_FIXTURES[0].lore;
const cedarDisclosure = FINANCE_CATALOG_FIXTURES[3].lore;
const memories: MemoryResponse = {
	langCode: 'eng',
	shortTermHistory: [],
	longTermHistory: [],
	relevantLore: [cedar, cedarDisclosure],
	relevantHistory: [],
	relevantDocuments: [],
};
const evidence: RagEvidenceDto = {
	domain: 'finance',
	characterId: 'finance-assistant_demo',
	sessionId: 'finance-assistant_demo_session',
	profileFieldsUsed: ['domain', 'investmentHorizonMonths'],
	items: [
		{ sourceKind: 'character_lore', sourceId: cedar.loreId, label: cedar.title, domain: 'finance' },
		{
			sourceKind: 'character_lore',
			sourceId: cedarDisclosure.loreId,
			label: cedarDisclosure.title,
			domain: 'finance',
		},
	],
	excluded: [],
	structuredFilterDecisions: [
		{ sourceId: cedar.loreId, label: cedar.title, decision: 'eligible', reasons: [] },
	],
	missingInformation: [{ source: 'session_profile', field: 'riskPreference' }],
	assumptions: [
		{ source: 'current_request', description: 'Temporary investment horizon: 6 months.' },
	],
};
const context: ResolvedRagContext = {
	domain: 'finance',
	characterId: evidence.characterId,
	sessionId: evidence.sessionId,
	currentMessage: 'Create a fictional report.',
	sessionProfile: { domain: 'finance', investmentHorizonMonths: 12, constraints: [] },
	memories,
	evidence,
};
const output: FinanceReportOutput = {
	title: 'Fictional finance report',
	summary: 'A conditional educational comparison.',
	productMatches: [
		{
			productFixtureId: cedar.fixtureId!,
			rationale: 'The fictional product has high liquidity.',
			riskWarnings: ['Yield is not guaranteed.'],
			evidenceIds: [cedar.loreId, cedarDisclosure.loreId],
		},
	],
	generalRiskWarnings: ['All fictional products can have limitations.'],
};

test('finance report schema is strict and capped at three products', () => {
	assert.equal(financeReportOutputSchema.parse(output).productMatches.length, 1);
	assert.throws(() =>
		financeReportOutputSchema.parse({
			...output,
			productMatches: Array.from({ length: 4 }, () => output.productMatches[0]),
		})
	);
	assert.throws(() => financeReportOutputSchema.parse({ ...output, hiddenReasoning: 'secret' }));
});

test('finance report evidence validation rejects absent products and invented evidence IDs', () => {
	assert.equal(validateFinanceReportEvidence(output, context), output);
	assert.throws(
		() =>
			validateFinanceReportEvidence(
				{
					...output,
					productMatches: [{ ...output.productMatches[0], productFixtureId: 'invented-product' }],
				},
				context
			),
		/ineligible product/
	);
	assert.throws(
		() =>
			validateFinanceReportEvidence(
				{
					...output,
					productMatches: [{ ...output.productMatches[0], evidenceIds: ['invented-evidence'] }],
				},
				context
			),
		/invalid evidence/
	);
});

test('finance report Markdown uses canonical names, fixed disclaimer, and escaped model text', () => {
	const markdown = renderFinanceReportMarkdown(
		{ ...output, summary: '<script>unsafe()</script>' },
		context
	);

	assert.match(markdown, new RegExp(cedar.title));
	assert.match(markdown, /not financial advice/i);
	assert.match(markdown, /Temporary investment horizon: 6 months/);
	assert.match(markdown, new RegExp(cedar.loreId));
	assert.doesNotMatch(markdown, /<script>/);
	assert.match(markdown, /&lt;script&gt;/);
});

test('finance report prompt contains eligible canonical evidence and no hidden reasoning request', () => {
	const serialized = buildFinanceReportMessages(context)
		.map(({ content }) => String(content))
		.join('\n');

	assert.match(serialized, new RegExp(cedar.loreId));
	assert.match(serialized, /DEMO DATA ONLY/);
	assert.match(serialized, /allowedEvidenceIds/);
	assert.doesNotMatch(serialized, /chain-of-thought/i);
});
