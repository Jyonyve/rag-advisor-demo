import assert from 'node:assert/strict';
import test from 'node:test';
import { METADATA_TYPES } from '@rag-advisor-demo/shared/config';
import { LoreInfo } from '@rag-advisor-demo/shared/domain';
import { filterLoreCandidates } from './loreStore.js';

const createLore = (
	loreId: string,
	userId: string,
	category: 'World' | 'Item',
	characterIds: string[],
	keywordList: string[] = [],
	sessionId?: string
): LoreInfo =>
	({
		loreId,
		userId,
		sessionId,
		type: category === 'World' ? METADATA_TYPES.WORLD : METADATA_TYPES.LORE,
		category,
		title: loreId,
		generatedTitle: loreId,
		summary: loreId,
		content: loreId,
		...(category === 'Item' ? { source: 'fixture' } : {}),
		characterIds,
		keywordList,
		topicList: [],
		entityList: [],
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
	}) as LoreInfo;

test('lore candidates include only the requested user even for world and keyword matches', () => {
	const candidates = filterLoreCandidates(
		[
			createLore('owned-world', 'user-a', 'World', []),
			createLore('owned-character', 'user-a', 'Item', ['character-a']),
			createLore('other-world', 'user-b', 'World', []),
			createLore('other-keyword', 'user-b', 'Item', [], ['memory-map']),
		],
		'user-a',
		'character-a',
		undefined,
		{ keywords: ['memory-map'] }
	);

	assert.deepEqual(
		candidates.map((lore) => lore.loreId),
		['owned-world', 'owned-character']
	);
});

test('owned keyword lore remains eligible when it is not directly linked to the character', () => {
	const candidates = filterLoreCandidates(
		[
			createLore('owned-match', 'user-a', 'Item', [], ['memory-map']),
			createLore('owned-noise', 'user-a', 'Item', [], ['weather']),
		],
		'user-a',
		'character-a',
		undefined,
		{ keywords: ['memory-map'] }
	);

	assert.deepEqual(
		candidates.map((lore) => lore.loreId),
		['owned-match']
	);
});

test('session lore is isolated while character and world lore remain shared across sessions', () => {
	const lores = [
		createLore('world', 'user-a', 'World', []),
		createLore('character', 'user-a', 'Item', ['character-a']),
		createLore('session-a', 'user-a', 'Item', ['character-a'], [], 'session-a'),
		createLore('session-b', 'user-a', 'Item', ['character-a'], [], 'session-b'),
	];

	assert.deepEqual(
		filterLoreCandidates(lores, 'user-a', 'character-a', 'session-a').map((lore) => lore.loreId),
		['world', 'character', 'session-a']
	);
	assert.deepEqual(
		filterLoreCandidates(lores, 'user-a', 'character-a', 'session-b').map((lore) => lore.loreId),
		['world', 'character', 'session-b']
	);
});

test('session lore is excluded when no session scope is requested', () => {
	const lores = [
		createLore('character', 'user-a', 'Item', ['character-a']),
		createLore('session-only', 'user-a', 'Item', ['character-a'], [], 'session-a'),
	];

	assert.deepEqual(
		filterLoreCandidates(lores, 'user-a', 'character-a').map((lore) => lore.loreId),
		['character']
	);
});
