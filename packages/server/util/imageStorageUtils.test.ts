import assert from 'node:assert/strict';
import test from 'node:test';
import {
	buildCharacterPortraitUrls,
	buildCharacterAvatarUrls,
	buildHistoryImageUrl,
	getCharacterPortraitUrls,
} from './imageStorageUtils.js';

test('buildCharacterPortraitUrls filters unrelated files and prefers AVIF portraits', () => {
	assert.deepEqual(
		buildCharacterPortraitUrls('finance_demo', [
			'finance_demo_0.webp',
			'finance_demo_0.avif',
			'finance_demo_1.png',
			'finance_demo_99.avif',
			'finance_demo_notes.txt',
			'other_2.avif',
		]),
		{
			0: '/assets/character/finance_demo/finance_demo_0.avif',
			1: '/assets/character/finance_demo/finance_demo_1.png',
		}
	);
});

test('portrait and avatar discovery keep paired emotion assets separate', () => {
	const files = [
		'finance_demo_0.avif',
		'finance_demo_0_a.webp',
		'finance_demo_0_a.avif',
		'finance_demo_1_a.png',
	];
	assert.deepEqual(buildCharacterPortraitUrls('finance_demo', files), {
		0: '/assets/character/finance_demo/finance_demo_0.avif',
	});
	assert.deepEqual(buildCharacterAvatarUrls('finance_demo', files), {
		0: '/assets/character/finance_demo/finance_demo_0_a.avif',
		1: '/assets/character/finance_demo/finance_demo_1_a.png',
	});
});

test('buildCharacterPortraitUrls URL-encodes runtime path segments', () => {
	assert.deepEqual(buildCharacterPortraitUrls('character one', ['character one_0.avif']), {
		0: '/assets/character/character%20one/character%20one_0.avif',
	});
});

test('buildHistoryImageUrl returns the preferred matching history image', () => {
	assert.equal(
		buildHistoryImageUrl('character one', 'history one', [
			'history one.webp',
			'history one.avif',
			'other.avif',
		]),
		'/assets/character/character%20one/lore/history%20one.avif'
	);
});

test('getCharacterPortraitUrls returns an empty map for a missing character directory', async () => {
	assert.deepEqual(await getCharacterPortraitUrls('__missing_character_storage_test__'), {});
});
