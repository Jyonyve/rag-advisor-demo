import assert from 'node:assert/strict';
import test from 'node:test';

import {
	buildDefaultFinanceReportRequest,
	buildFinanceDomainProfile,
	buildHealthcareDomainProfile,
	countEvidenceKinds,
	getSessionDomain,
	summarizeDomainProfile,
} from './workspaceConfig.js';
import { parseReportMarkdown } from './reportMarkdownUtils.js';
import { getWorkspaceCopy, getWorkspaceDomainConfig } from './workspaceI18n.js';

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
		'Compare the eligible fictional finance products for this session profile with a moderate-risk preference, a 36-month horizon, a medium liquidity need. Explain material risks and cite the supporting evidence.'
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

test('workspace copy provides distinct persisted language variants', () => {
	assert.equal(getWorkspaceCopy('kor').report, '금융 보고서');
	assert.equal(getWorkspaceCopy('eng').report, 'Finance report');
	assert.notEqual(getWorkspaceCopy('kor').references, getWorkspaceCopy('eng').references);
	assert.equal(getWorkspaceDomainConfig('finance', 'kor').shortTitle, '금융');
	assert.equal(getWorkspaceDomainConfig('finance', 'eng').shortTitle, 'Finance');
	assert.equal(getWorkspaceDomainConfig('finance', 'kor').suggestedPrompts.length, 5);
	assert.equal(getWorkspaceDomainConfig('finance', 'eng').suggestedPrompts.length, 5);
	assert.match(getWorkspaceDomainConfig('finance', 'kor').suggestedPrompts[1]!, /6개월/);
	assert.match(getWorkspaceDomainConfig('finance', 'eng').suggestedPrompts[3]!, /balanced/i);
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
	assert.match(buildDefaultFinanceReportRequest(undefined, 'kor'), /가상 금융 상품/);
});
