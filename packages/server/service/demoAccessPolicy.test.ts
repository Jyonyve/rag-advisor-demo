import assert from 'node:assert/strict';
import test from 'node:test';
import {
	classifyDemoProviderError,
	COUNTED_DEMO_GENERATION_STATUSES,
	evaluateDemoReservation,
	getPublicDemoModel,
	resolveDemoUsageAvailability,
	resolveDemoReservationStaleBefore,
} from './demoAccessService.js';
import { buildDemoGuestInitResponse, createInternalGuestCredentials } from './demoGuestService.js';
import { parseDemoCleanupArgs } from './demoCleanupService.js';
import { isOfficialDemoCharacter } from './officialDemoFixtures.js';
import { buildFallbackText } from './orchestrationService.js';
import { selectLoreOwner } from '../store/loreStore.js';
import { renderClientShell } from '../util/clientShellUtils.js';

test('two guest initializations produce distinct internal identities', () => {
	const first = createInternalGuestCredentials();
	const second = createInternalGuestCredentials();
	assert.notEqual(first.guestId, second.guestId);
	assert.notEqual(first.email, second.email);
	assert.notEqual(first.password, second.password);
	assert.ok(first.password.length >= 40);
});

test('guest response does not serialize credentials or a client-selected user id', () => {
	const credentials = createInternalGuestCredentials();
	const response = buildDemoGuestInitResponse({
		chat: { used: 0, limit: 5, remaining: 5 },
		report: { used: 0, limit: 1, remaining: 1 },
		liveGenerationEnabled: false,
		mode: 'fallback',
		reason: 'LIVE_GENERATION_DISABLED',
	});
	const serialized = JSON.stringify(response);
	assert.equal(serialized.includes(credentials.email), false);
	assert.equal(serialized.includes(credentials.password), false);
	assert.equal('userId' in response, false);
});

test('public model policy is fixed with bounded outputs', () => {
	assert.deepEqual(getPublicDemoModel('chat'), {
		platform: 'direct',
		provider: 'openai',
		model: 'gpt-5.6-terra',
		maxTokens: 800,
	});
	assert.equal(getPublicDemoModel('report').model, 'gpt-5.6-terra');
	assert.equal(getPublicDemoModel('report').maxTokens, 1800);
});

test('usage status defaults to fallback whenever live generation is unavailable', () => {
	assert.deepEqual(resolveDemoUsageAvailability(false, false), {
		liveGenerationEnabled: false,
		mode: 'fallback',
		reason: 'LIVE_GENERATION_DISABLED',
	});
	assert.deepEqual(resolveDemoUsageAvailability(true, false), {
		liveGenerationEnabled: false,
		mode: 'fallback',
		reason: 'LIVE_GENERATION_DISABLED',
	});
	assert.deepEqual(resolveDemoUsageAvailability(true, true), {
		liveGenerationEnabled: true,
		mode: 'live',
	});
});

test('guest, global, and concurrent limits deny a reservation before provider use', () => {
	const base = { guestLimit: 5, globalLimit: 30, concurrentLimit: 2 };
	assert.equal(
		evaluateDemoReservation({ ...base, guestActive: 5, globalActive: 5, concurrentActive: 0 }),
		'GUEST_LIMIT'
	);
	assert.equal(
		evaluateDemoReservation({ ...base, guestActive: 1, globalActive: 30, concurrentActive: 0 }),
		'GLOBAL_LIMIT'
	);
	assert.equal(
		evaluateDemoReservation({ ...base, guestActive: 1, globalActive: 1, concurrentActive: 2 }),
		'GLOBAL_LIMIT'
	);
	assert.equal(
		evaluateDemoReservation({ ...base, guestActive: 4, globalActive: 29, concurrentActive: 1 }),
		undefined
	);
	assert.equal(
		evaluateDemoReservation({
			guestActive: 1,
			guestLimit: 1,
			globalActive: 1,
			globalLimit: 6,
			concurrentActive: 0,
			concurrentLimit: 2,
		}),
		'GUEST_LIMIT'
	);
});

test('every reserved generation attempt consumes quota regardless of its outcome', () => {
	assert.deepEqual(COUNTED_DEMO_GENERATION_STATUSES, ['reserved', 'succeeded', 'failed']);
});

test('report reservations use the longer report timeout before becoming stale', () => {
	const now = new Date('2026-08-03T12:00:00.000Z');
	const timeouts = { chatMs: 45_000, reportMs: 180_000 };

	assert.equal(resolveDemoReservationStaleBefore('chat', now, timeouts), '2026-08-03T11:58:30.000Z');
	assert.equal(
		resolveDemoReservationStaleBefore('report', now, timeouts),
		'2026-08-03T11:54:00.000Z'
	);
});

test('provider failures map to typed public fallback reasons', () => {
	assert.equal(classifyDemoProviderError({ name: 'AbortError' }), 'PROVIDER_TIMEOUT');
	assert.equal(classifyDemoProviderError({ status: 429 }), 'PROVIDER_RATE_LIMIT');
	assert.equal(
		classifyDemoProviderError({ status: 429, code: 'insufficient_quota' }),
		'PROVIDER_QUOTA'
	);
	assert.equal(classifyDemoProviderError(new Error('secret detail')), 'PROVIDER_ERROR');
});

test('fallback is deterministic, grounded, and explicitly non-provider output', () => {
	const context = {
		domain: 'finance',
		currentMessage: 'Compare the approved fictional options.',
		sessionProfile: { domain: 'finance', riskPreference: 'conservative', constraints: [] },
		memories: {
			longTermHistory: [{ sequence: 1 }],
			relevantLore: [{ title: 'Demo Deposit', loreId: 'finance-demo-deposit_lore' }],
			relevantDocuments: [],
		},
		evidence: { excluded: [{ sourceKind: 'character_lore', reason: 'risk_mismatch', count: 1 }] },
	} as any;
	const first = buildFallbackText('LIVE_GENERATION_DISABLED', context);
	assert.equal(first, buildFallbackText('LIVE_GENERATION_DISABLED', context));
	assert.match(first, /not a provider-generated answer/i);
	assert.match(first, /Demo Deposit \[finance-demo-deposit_lore\]/);
	assert.match(first, /riskPreference/);
	assert.match(first, /risk_mismatch/);
});

test('shared reads are limited to deterministic official fixture identities', () => {
	assert.equal(isOfficialDemoCharacter('finance-assistant_demo'), true);
	assert.equal(isOfficialDemoCharacter('healthcare-operations-assistant_demo'), true);
	assert.equal(isOfficialDemoCharacter('visitor-character_demo'), false);
});

test('official Lore derives the deployed runtime owner from fixed Character records', () => {
	assert.equal(
		selectLoreOwner(
			['finance-assistant_demo'],
			[{ characterId: 'finance-assistant_demo', userId: 'runtime-fixture-owner' }],
			'guest-user'
		),
		'runtime-fixture-owner'
	);
	assert.equal(
		selectLoreOwner(
			['visitor-character_demo'],
			[{ characterId: 'visitor-character_demo', userId: 'another-visitor' }],
			'guest-user'
		),
		'guest-user'
	);
});

test('cleanup defaults dry and execute requires one explicit flag', () => {
	assert.deepEqual(parseDemoCleanupArgs([]), { execute: false, dryRun: true, hours: 24 });
	assert.deepEqual(parseDemoCleanupArgs(['--older-than-hours', '48', '--execute']), {
		execute: true,
		dryRun: false,
		hours: 48,
	});
	assert.throws(() => parseDemoCleanupArgs(['--execute', '--dry-run']));
});

test('client shell exposes only non-secret public runtime configuration', () => {
	const html = renderClientShell(
		'<html><!--emotion-styles--><body><!--app-html--><!--server-data--></body></html>',
		'eng',
		true
	);
	assert.match(html, /window\.__INITIAL_LANG__="eng"/);
	assert.match(html, /window\.__PUBLIC_DEMO_MODE__=true/);
	assert.doesNotMatch(html, /<!--(?:app-html|emotion-styles|server-data)-->/);
});
