import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_LANG } from '@rag-advisor-demo/shared/config';
import { detectBrowserLanguage } from './languageDetection.js';

test('detectBrowserLanguage selects Korean from the browser language list', () => {
	assert.equal(detectBrowserLanguage(['en-US', 'ko-KR'], 'en-US'), 'kor');
});

test('detectBrowserLanguage selects Korean from the primary browser language', () => {
	assert.equal(detectBrowserLanguage(undefined, 'ko'), 'kor');
});

test('detectBrowserLanguage uses the safe default when no Korean locale is present', () => {
	assert.equal(detectBrowserLanguage(['en-US', 'en'], 'en-US'), DEFAULT_LANG);
	assert.equal(detectBrowserLanguage(undefined, undefined), DEFAULT_LANG);
});
