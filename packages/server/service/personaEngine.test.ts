import assert from 'node:assert/strict';
import test from 'node:test';

import type { MemoryResponse } from '@rag-advisor-demo/shared/api';
import { METADATA_TYPES } from '@rag-advisor-demo/shared/config';
import type { ProfileInfo } from '@rag-advisor-demo/shared/domain';
import { buildSessionId } from '@rag-advisor-demo/shared/util';

import { DEMO_CHARACTER_FIXTURES } from '../fixture/domainFixtures.js';
import { FINANCE_CATALOG_FIXTURES } from '../fixture/financeFixtures.js';
import { buildPersonaMessages } from './personaEngine.js';

const character = DEMO_CHARACTER_FIXTURES[0].character;
const sessionId = buildSessionId(character.characterId);
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
