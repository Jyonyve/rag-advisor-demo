import assert from 'node:assert/strict';
import test from 'node:test';

import type { MemoryResponse } from '@rag-advisor-demo/shared/api';
import type { RagEvidenceDto } from '@rag-advisor-demo/shared/domain';

import { FINANCE_CATALOG_FIXTURES } from '../fixture/financeFixtures.js';
import type { ResolvedRagContext } from './ragContextService.js';
import {
	buildFinanceReportSourceRefs,
	buildFinanceReportMessages,
	financeReportOutputSchema,
	mergeFinanceReportLore,
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
	recommendation: {
		recommendedProductFixtureId: cedar.fixtureId!,
		conclusion: 'This option is the strongest supported fit for the current request.',
		reasons: ['Its liquidity is consistent with the stated horizon.'],
	},
	productMatches: [
		{
			productFixtureId: cedar.fixtureId!,
			fitSummary: 'The product has high liquidity.',
			advantages: ['Funds remain accessible.'],
			disadvantages: ['Returns may be lower than longer-term alternatives.'],
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
					recommendation: { ...output.recommendation, recommendedProductFixtureId: 'invented-product' },
				},
				context
			),
		/unlisted product/
	);
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

	assert.match(markdown, /### 가온 생활예비 통장/);
	assert.match(markdown, /## Final recommendation/);
	assert.match(markdown, /## Product matches/);
	assert.match(markdown, /not financial advice/i);
	assert.match(markdown, /Temporary investment horizon: 6 months/);
	assert.match(markdown, new RegExp(cedar.loreId));
	assert.doesNotMatch(markdown, /<script>/);
	assert.match(markdown, /&lt;script&gt;/);
});

test('finance report narrative replaces stable fixture and Lore IDs with canonical titles', () => {
	const markdown = renderFinanceReportMarkdown(
		{
			...output,
			recommendation: {
				...output.recommendation,
				conclusion: `Choose ${cedar.fixtureId}; review ${cedarDisclosure.loreId}.`,
			},
		},
		context
	);

	assert.match(markdown, /Choose 가온 생활예비 통장/);
	assert.ok(markdown.includes(`review ${cedarDisclosure.title.replace(/^DEMO\s*[—-]\s*/i, '')}`));
	assert.doesNotMatch(markdown, /Choose cedar-reserve-account/);
});

test('finance report Markdown and generation instructions follow the recalled language', () => {
	const olderAmountTurn = {
		chatTurnId: 'finance-assistant_demo_session_2_turn',
		sequence: 2,
		request: { entries: [{ type: 'dialogue', prompt: '월 투자 가능 금액은 70만 원입니다.' }] },
		response: { entries: [{ type: 'dialogue', prompt: '알겠습니다.' }] },
	} as MemoryResponse['shortTermHistory'][number];
	const amountTurn = {
		chatTurnId: 'finance-assistant_demo_session_4_turn',
		sequence: 4,
		request: { entries: [{ type: 'dialogue', prompt: '제가 지금 여유자금 100만원이 있어요.' }] },
		response: { entries: [{ type: 'dialogue', prompt: '언제 사용할 돈인지 먼저 확인해 볼게요.' }] },
	} as MemoryResponse['shortTermHistory'][number];
	const koreanContext: ResolvedRagContext = {
		...context,
		currentMessage:
			'이 돈을 1년 뒤 이사비로 쓴다고 가정해 주세요. 적합한 상품과 제외 이유를 알려주세요.',
		memories: { ...memories, langCode: 'kor', shortTermHistory: [olderAmountTurn, amountTurn] },
	};
	const markdown = renderFinanceReportMarkdown(output, koreanContext);
	const prompt = buildFinanceReportMessages(koreanContext)
		.map(({ content }) => String(content))
		.join('\n');

	assert.match(markdown, /## 요약/);
	assert.match(markdown, /## 최종 추천/);
	assert.match(markdown, /## 이 리포트에 사용한 요청/);
	assert.match(markdown, /이 돈을 1년 뒤 이사비로 쓴다고 가정해 주세요/);
	assert.match(markdown, /## 사용한 대화 턴/);
	assert.match(markdown, /대화 2 — 사용자 질문: 월 투자 가능 금액은 70만 원입니다/);
	assert.match(markdown, /대화 4 — 사용자 질문: 제가 지금 여유자금 100만원이 있어요/);
	assert.match(markdown, /앞선 대화에서 이어받은 정보/);
	assert.match(markdown, /금액: 100만원/);
	assert.match(markdown, /## 사용한 세션 프로필/);
	assert.match(markdown, /## 이번 요청에서 새로 추가한 가정/);
	assert.match(markdown, /## 상품 비교/);
	assert.match(markdown, /투자 기간: 12개월/);
	assert.match(markdown, /이번 요청에서는 투자 기간을 6개월로 가정했습니다/);
	assert.doesNotMatch(markdown, /Temporary investment horizon/);
	assert.match(markdown, /위험 감수 성향/);
	assert.doesNotMatch(markdown, /## Summary/);
	assert.match(prompt, /Write every model-generated field in Korean/);
	assert.match(prompt, /conversationContext/);
	assert.match(prompt, /carriedConversationFacts/);
	assert.match(prompt, /여유자금 100만원/);
	assert.match(prompt, /언제 사용할 돈인지 먼저 확인해 볼게요/);
	assert.match(prompt, /이 돈/);
});

test('finance report source references exactly match the fixed turn snapshot', () => {
	const refs = buildFinanceReportSourceRefs(memories, [
		'finance-assistant_demo_session_2_turn',
		'finance-assistant_demo_session_4_turn',
		'finance-assistant_demo_session_2_turn',
	]);

	assert.deepEqual(refs.chatTurnIds, [
		'finance-assistant_demo_session_2_turn',
		'finance-assistant_demo_session_4_turn',
	]);
	assert.deepEqual(refs.loreIds, [cedar.loreId, cedarDisclosure.loreId]);
});

test('finance reports do not carry an old amount into a request without a money reference', () => {
	const amountTurn = {
		chatTurnId: 'finance-assistant_demo_session_4_turn',
		sequence: 4,
		request: { entries: [{ type: 'dialogue', prompt: '여유자금은 100만원입니다.' }] },
		response: { entries: [{ type: 'dialogue', prompt: '확인했습니다.' }] },
	} as MemoryResponse['shortTermHistory'][number];
	const unrelatedContext: ResolvedRagContext = {
		...context,
		currentMessage: '예금자보호 제도를 설명해 주세요.',
		memories: { ...memories, langCode: 'kor', shortTermHistory: [amountTurn] },
	};

	const markdown = renderFinanceReportMarkdown(output, unrelatedContext);
	assert.doesNotMatch(markdown, /앞선 대화에서 이어받은 정보/);
	assert.doesNotMatch(markdown, /금액: 100만원/);
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

test('finance reports retain retrieved ranking while adding missing canonical Character Lore once', () => {
	const harbor = FINANCE_CATALOG_FIXTURES[1].lore;
	assert.deepEqual(
		mergeFinanceReportLore([cedar, harbor], [cedar, cedarDisclosure]).map(({ loreId }) => loreId),
		[cedar.loreId, harbor.loreId, cedarDisclosure.loreId]
	);
});
