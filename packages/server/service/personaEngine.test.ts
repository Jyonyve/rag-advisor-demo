import assert from 'node:assert/strict';
import test from 'node:test';

import type { MemoryResponse } from '@rag-advisor-demo/shared/api';
import { METADATA_TYPES } from '@rag-advisor-demo/shared/config';
import type { ProfileInfo } from '@rag-advisor-demo/shared/domain';
import { buildSessionId } from '@rag-advisor-demo/shared/util';
import {
	ensureDomainDemoDisclaimer,
	FINANCE_DEMO_NOTICE,
	HEALTHCARE_OPERATIONS_DEMO_NOTICE,
} from './orchestrationService.js';

import { DEMO_CHARACTER_FIXTURES } from '../fixture/domainFixtures.js';
import { FINANCE_CATALOG_FIXTURES } from '../fixture/financeFixtures.js';
import { HEALTHCARE_OPERATIONS_FIXTURES } from '../fixture/healthcareOperationsFixtures.js';
import { buildPersonaMessages } from './personaEngine.js';

const character = DEMO_CHARACTER_FIXTURES[0].character;
const sessionId = buildSessionId(character.characterId);

test('finance chat responses receive a deterministic demo disclaimer when omitted', () => {
	assert.equal(
		ensureDomainDemoDisclaimer('A grounded comparison.', { domain: 'finance' }),
		`A grounded comparison.\n\n${FINANCE_DEMO_NOTICE}`
	);
	assert.equal(
		ensureDomainDemoDisclaimer('This is not financial advice.', { domain: 'finance' }),
		'This is not financial advice.'
	);
	assert.equal(
		ensureDomainDemoDisclaimer('Administrative guidance.', { domain: 'healthcare_operations' }),
		`Administrative guidance.\n\n${HEALTHCARE_OPERATIONS_DEMO_NOTICE}`
	);
	assert.equal(
		ensureDomainDemoDisclaimer('This is not medical advice.', { domain: 'healthcare_operations' }),
		'This is not medical advice.'
	);
});
const profile: ProfileInfo = {
	profileId: 'finance-profile_demo',
	sessionId,
	userId: 'finance-prompt-demo-user',
	name: 'Demo User',
	showName: 'Demo User',
	title: 'Fictional demo profile',
	description: 'Fictional profile.',
	gender: 'nocomment',
	type: METADATA_TYPES.PROFILE,
	createdAt: '2026-07-24T00:00:00.000Z',
	updatedAt: '2026-07-24T00:00:00.000Z',
	domainProfile: {
		domain: 'finance',
		investmentHorizonMonths: 12,
		liquidityNeed: 'high',
		riskPreference: 'conservative',
		constraints: [],
	},
};

test('finance persona messages contain canonical eligible evidence and finance safety rules', () => {
	const cedar = { ...FINANCE_CATALOG_FIXTURES[0].lore, userId: profile.userId };
	const memories: MemoryResponse = {
		langCode: 'eng',
		shortTermHistory: [],
		longTermHistory: [],
		relevantLore: [cedar],
		relevantHistory: [],
		relevantDocuments: [],
	};
	const messages = buildPersonaMessages(
		memories,
		character,
		profile,
		'Compare the fictional demo products.'
	);
	const prompt = messages.map(({ content }) => String(content)).join('\n');

	assert.match(prompt, /not financial advice/i);
	assert.match(prompt, /Canonical session profile/);
	assert.match(prompt, new RegExp(cedar.loreId));
	assert.match(prompt, /Canonical body:/);
	assert.match(prompt, /DEMO DATA ONLY/);
	assert.match(prompt, /cite stable source IDs/i);
	assert.doesNotMatch(prompt, /third-person limited narrator/i);
	assert.equal(messages.at(-1)?.role, 'user');
});

test('healthcare operations persona messages contain canonical workflow evidence and safety rules', () => {
	const healthcareCharacter = DEMO_CHARACTER_FIXTURES[1].character;
	const healthcareSessionId = buildSessionId(healthcareCharacter.characterId);
	const healthcareProfile: ProfileInfo = {
		...profile,
		profileId: 'healthcare-operations-profile_demo',
		sessionId: healthcareSessionId,
		domainProfile: {
			domain: 'healthcare_operations',
			workflowTopic: 'Billing inquiry',
			requesterRole: 'patient_support',
			urgency: 'routine',
			constraints: [],
		},
	};
	const billing = { ...HEALTHCARE_OPERATIONS_FIXTURES[3].lore, userId: healthcareProfile.userId };
	const memories: MemoryResponse = {
		langCode: 'eng',
		shortTermHistory: [],
		longTermHistory: [],
		relevantLore: [billing],
		relevantHistory: [],
		relevantDocuments: [],
	};
	const messages = buildPersonaMessages(
		memories,
		healthcareCharacter,
		healthcareProfile,
		'Explain the fictional billing inquiry workflow.'
	);
	const prompt = messages.map(({ content }) => String(content)).join('\n');

	assert.match(prompt, /not medical advice/i);
	assert.match(prompt, /administrative workflow assistant/i);
	assert.match(prompt, new RegExp(billing.loreId));
	assert.match(prompt, /Canonical body:/);
	assert.match(prompt, /requester-role/i);
	assert.match(prompt, /cite stable source IDs/i);
	assert.doesNotMatch(prompt, /third-person limited narrator/i);
	assert.equal(messages.at(-1)?.role, 'user');
});
