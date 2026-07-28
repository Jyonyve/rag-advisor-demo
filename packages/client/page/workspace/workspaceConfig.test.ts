import assert from 'node:assert/strict';
import test from 'node:test';

import type { RagEvidenceDto } from '@rag-advisor-demo/shared/domain';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { getEvidenceAnchorId, GroundedResponse } from './GroundedResponse.js';
import {
	buildDefaultFinanceReportRequest,
	buildFinanceDomainProfile,
	buildHealthcareDomainProfile,
	countEvidenceKinds,
	getSessionDomain,
	getSessionDisplayTitle,
	summarizeDomainProfile,
	stripFinanceAnswerNotices,
} from './workspaceConfig.js';
import {
	omitDuplicateLeadingReportTitle,
	parseReportMarkdown,
	splitReportLoreCitations,
} from './reportMarkdownUtils.js';
import { getWorkspaceCopy, getWorkspaceDomainConfig } from './workspaceI18n.js';

const citationEvidence: RagEvidenceDto = {
	domain: 'finance',
	characterId: 'finance-assistant_demo',
	sessionId: 'finance-session',
	profileFieldsUsed: [],
	items: [
		{
			sourceKind: 'character_lore',
			sourceId: 'hanul-balanced-portfolio_demo-lore',
			label: 'DEMO — 한울 균형 포트폴리오',
			domain: 'finance',
		},
	],
	excluded: [],
	structuredFilterDecisions: [],
	missingInformation: [],
	assumptions: [],
};

test('grounded responses preserve sections and resolve source IDs into labeled citation buttons', () => {
	const markup = renderToStaticMarkup(
		createElement(GroundedResponse, {
			text: '*한눈에 보기\n\n- 원금 손실 가능성이 있습니다. [hanul-balanced-portfolio_demo-lore]*',
			evidence: citationEvidence,
			citationLabel: '근거',
		})
	);

	assert.match(markup, /한눈에 보기/);
	assert.match(markup, /advisor-response-spacer/);
	assert.match(markup, /advisor-response-bullet/);
	assert.match(markup, /근거 · DEMO — 한울 균형 포트폴리오/);
	assert.doesNotMatch(markup, /\*한눈에 보기/);
});

test('grounded responses generate stable evidence anchors for citation navigation', () => {
	assert.equal(
		getEvidenceAnchorId('hanul-balanced-portfolio_demo-lore'),
		'advisor-source-hanul-balanced-portfolio_demo-lore'
	);
});

test('finance profile builder preserves the strict discriminator and omits missing suitability fields', () => {
	assert.deepEqual(
		buildFinanceDomainProfile({
			investmentGoal: ' Emergency reserve ',
			investmentHorizonMonths: '',
			liquidityNeed: 'high',
			riskPreference: '',
			constraints: 'No lock-up, fictional demo only',
		}),
		{
			domain: 'finance',
			investmentGoal: 'Emergency reserve',
			liquidityNeed: 'high',
			constraints: ['No lock-up', 'fictional demo only'],
		}
	);
});

test('healthcare profile builder keeps incomplete profiles distinguishable from missing profiles', () => {
	assert.deepEqual(
		buildHealthcareDomainProfile({
			workflowTopic: '',
			requesterRole: 'patient_support',
			urgency: '',
			constraints: '',
		}),
		{ domain: 'healthcare_operations', requesterRole: 'patient_support', constraints: [] }
	);
});

test('workspace utilities identify supported sessions and expose missing fields', () => {
	assert.equal(
		getSessionDomain({
			sessionId: 'session',
			userId: 'user',
			profileId: 'profile',
			characterId: 'finance-assistant_demo',
			title: 'Demo',
			createdAt: '',
			updatedAt: '',
			messageCount: 0,
			status: 'active',
			type: 'session',
			lastCharMessage: '',
			userNote: '',
		}),
		'finance'
	);
	assert.equal(
		summarizeDomainProfile({ domain: 'finance', constraints: [] }).filter((field) => field.missing)
			.length,
		4
	);
});

test('evidence counts remain grouped by source kind', () => {
	assert.deepEqual(
		countEvidenceKinds({
			domain: 'finance',
			characterId: 'finance-assistant_demo',
			sessionId: 'session',
			profileFieldsUsed: [],
			items: [
				{ sourceKind: 'character_lore', sourceId: 'one', label: 'One', domain: 'finance' },
				{ sourceKind: 'character_lore', sourceId: 'two', label: 'Two', domain: 'finance' },
				{
					sourceKind: 'session_document',
					sourceId: 'three',
					label: 'Three',
					domain: 'finance',
					origin: 'manual',
				},
			],
			excluded: [],
			structuredFilterDecisions: [],
			missingInformation: [],
			assumptions: [],
		}),
		[
			{ label: 'Official domain lore', count: 2 },
			{ label: 'Session documents', count: 1 },
		]
	);
});

test('finance report request includes the canonical structured profile values', () => {
	assert.equal(
		buildDefaultFinanceReportRequest({
			domain: 'finance',
			investmentHorizonMonths: 36,
			liquidityNeed: 'medium',
			riskPreference: 'moderate',
			constraints: [],
		}),
		'Compare up to three suitable products for this session profile with a moderate-risk preference, a 36-month horizon, a medium liquidity need. Explain benefits, access to funds, principal-loss risk, and deposit protection with citations, then recommend the best-supported option.'
	);
});

test('report Markdown parser exposes headings, notices, lists, and paragraphs as text blocks', () => {
	assert.deepEqual(
		parseReportMarkdown(
			'# Demo report\n\n> Fictional only.\n\n## Risks\n\n- No guarantee\n- Limited liquidity\n\nPlain summary.'
		),
		[
			{ type: 'heading', level: 1, text: 'Demo report' },
			{ type: 'blockquote', text: 'Fictional only.' },
			{ type: 'heading', level: 2, text: 'Risks' },
			{ type: 'list', items: ['No guarantee', 'Limited liquidity'] },
			{ type: 'paragraph', text: 'Plain summary.' },
		]
	);
});

test('report reader omits only a leading title already shown by the document header', () => {
	const blocks = parseReportMarkdown('# Recommendation result\n\n## Summary\n\nKeep this section.');
	assert.deepEqual(omitDuplicateLeadingReportTitle(blocks, 'Recommendation result'), [
		{ type: 'heading', level: 2, text: 'Summary' },
		{ type: 'paragraph', text: 'Keep this section.' },
	]);
	assert.deepEqual(omitDuplicateLeadingReportTitle(blocks, 'Different title'), blocks);
});

test('report citations distinguish clickable Lore IDs from ordinary bracketed text', () => {
	assert.deepEqual(
		splitReportLoreCitations(
			'근거 [cedar-reserve-account_demo-lore] 및 [ordinary-note]를 확인하세요.'
		),
		[
			{ type: 'text', text: '근거 ' },
			{ type: 'lore_citation', sourceId: 'cedar-reserve-account_demo-lore' },
			{ type: 'text', text: ' 및 [ordinary-note]를 확인하세요.' },
		]
	);
});

test('report citations split multiple Lore IDs from one legacy bracket group', () => {
	assert.deepEqual(
		splitReportLoreCitations(
			'[kr-depositor-protection-act-20260102_demo-lore, kr-deposit-limit-policy-20250901_demo-lore]'
		),
		[
			{ type: 'lore_citation', sourceId: 'kr-depositor-protection-act-20260102_demo-lore' },
			{ type: 'text', text: ', ' },
			{ type: 'lore_citation', sourceId: 'kr-deposit-limit-policy-20250901_demo-lore' },
		]
	);
});

test('workspace copy provides distinct persisted language variants', () => {
	assert.equal(getWorkspaceCopy('kor').report, '상품 추천 리포트');
	assert.equal(getWorkspaceCopy('eng').report, 'Product recommendation report');
	assert.notEqual(getWorkspaceCopy('kor').references, getWorkspaceCopy('eng').references);
	assert.equal(getWorkspaceDomainConfig('finance', 'kor').shortTitle, '금융');
	assert.equal(getWorkspaceDomainConfig('finance', 'eng').shortTitle, 'Finance');
	assert.equal(getWorkspaceDomainConfig('finance', 'kor').suggestedPrompts.length, 5);
	assert.equal(getWorkspaceDomainConfig('finance', 'eng').suggestedPrompts.length, 5);
	assert.match(getWorkspaceDomainConfig('finance', 'kor').suggestedPrompts[0]!, /매달 50만 원/);
	assert.match(getWorkspaceDomainConfig('finance', 'kor').suggestedPrompts[4]!, /보호/);
	assert.match(getWorkspaceDomainConfig('finance', 'eng').suggestedPrompts[1]!, /three years/i);
	assert.equal(
		getSessionDisplayTitle('Finance product exploration', 'finance', 'kor'),
		'금융 상품 알아보기'
	);
	assert.equal(
		getSessionDisplayTitle('Finance product exploration', 'finance', 'eng'),
		'Finance guide'
	);
	assert.equal(getSessionDisplayTitle('My custom plan', 'finance', 'kor'), 'My custom plan');
});

test('finance chat rendering removes repeated demo notices while preserving the answer', () => {
	assert.equal(
		stripFinanceAnswerNotices(
			'비교 결과입니다.\n\n상품과 시나리오는 가상 데모 데이터이며, 이는 금융 또는 법률 자문이 아닙니다.\n\n다음 조건을 확인하세요.'
		),
		'비교 결과입니다.\n\n다음 조건을 확인하세요.'
	);
	assert.equal(
		stripFinanceAnswerNotices('원금 손실 가능성이 있는 가상 상품입니다.'),
		'원금 손실 가능성이 있는 가상 상품입니다.'
	);
});

test('workspace helpers localize profile, evidence, and report request copy', () => {
	assert.equal(
		summarizeDomainProfile(
			{ domain: 'finance', riskPreference: 'moderate', constraints: [] },
			'kor'
		)[3]?.value,
		'중간'
	);
	assert.equal(
		countEvidenceKinds(
			{
				domain: 'finance',
				characterId: 'finance-assistant_demo',
				sessionId: 'session',
				profileFieldsUsed: [],
				items: [
					{ sourceKind: 'character_lore', sourceId: 'lore_demo', label: 'Demo lore', domain: 'finance' },
				],
				missingInformation: [],
				assumptions: [],
				excluded: [],
				structuredFilterDecisions: [],
			},
			'kor'
		)[0]?.label,
		'공식 도메인 지식'
	);
	assert.match(buildDefaultFinanceReportRequest(undefined, 'kor'), /상품을 최대 3개 비교/);
});
