import assert from 'node:assert/strict';
import test from 'node:test';
import { METADATA_TYPES } from '@rag-advisor-demo/shared/config';
import { CharacterTermInfo, SessionTermInfo } from '@rag-advisor-demo/shared/domain';
import { mergeTermScopes } from './termStore.js';

const characterTerm = (koreanTerm: string, englishTerm: string): CharacterTermInfo => ({
	termId: `character_${koreanTerm}`,
	type: METADATA_TYPES.CHARACTER,
	characterId: 'finance_demo',
	koreanTerm,
	englishTerm,
	initialTerm: englishTerm,
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z',
});

const sessionTerm = (koreanTerm: string, englishTerm: string): SessionTermInfo => ({
	termId: `session_${koreanTerm}`,
	type: METADATA_TYPES.SESSION,
	characterId: 'finance_demo',
	sessionId: 'finance_demo_session',
	koreanTerm,
	englishTerm,
	initialTerm: englishTerm,
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z',
});

test('mergeTermScopes includes reusable character terms and session-only terms', () => {
	const merged = mergeTermScopes(
		[characterTerm('균형 성장 펀드', 'Balanced Growth Fund')],
		[sessionTerm('정기 적금', 'Recurring Deposit')]
	);

	assert.deepEqual(
		merged.map(({ koreanTerm, englishTerm }) => [koreanTerm, englishTerm]),
		[
			['균형 성장 펀드', 'Balanced Growth Fund'],
			['정기 적금', 'Recurring Deposit'],
		]
	);
});

test('mergeTermScopes gives session terms precedence over character defaults', () => {
	const merged = mergeTermScopes(
		[characterTerm('위험 등급', 'Risk Rating')],
		[sessionTerm('위험 등급', 'Session Risk Rating')]
	);

	assert.equal(merged.length, 1);
	assert.equal(merged[0]?.englishTerm, 'Session Risk Rating');
	assert.equal(merged[0]?.type, METADATA_TYPES.SESSION);
});
