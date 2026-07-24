import assert from 'node:assert/strict';
import test from 'node:test';
import {
	DEFAULT_CHAT_DISPLAY_MODE,
	getChatDisplayModeStorageKey,
	readChatDisplayMode,
	writeChatDisplayMode,
} from './chatDisplayMode.js';

test('chat display mode defaults to book and persists valid preferences', () => {
	const values = new Map<string, string>();
	const storage = {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => values.set(key, value),
	};
	const key = getChatDisplayModeStorageKey('user-1');

	assert.equal(readChatDisplayMode(storage, key), DEFAULT_CHAT_DISPLAY_MODE);
	writeChatDisplayMode(storage, key, 'conversation');
	assert.equal(readChatDisplayMode(storage, key), 'conversation');
	values.set(key, 'unsupported');
	assert.equal(readChatDisplayMode(storage, key), DEFAULT_CHAT_DISPLAY_MODE);
});
