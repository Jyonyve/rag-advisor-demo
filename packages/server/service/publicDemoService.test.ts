import assert from 'node:assert/strict';
import test from 'node:test';
import { METADATA_TYPES } from '@rag-advisor-demo/shared/config';
import { CharacterInfo, DisplayTurn, SessionInfo } from '@rag-advisor-demo/shared/domain';
import { buildPublicDemoResponse, isDedicatedPublicDemo } from './publicDemoService.js';

const character: CharacterInfo = {
	characterId: 'internal-character-id',
	variant: 'internal-variant',
	contact: 'internal-contact',
	type: METADATA_TYPES.CHARACTER,
	name: 'Internal name',
	showName: 'Internal display name',
	gender: 'nocomment',
	title: 'Internal title',
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z',
	userId: 'internal-user-id',
	description: 'Internal description',
	worldIntroduction: 'Internal world introduction',
	instruction: 'Internal instruction',
	worldLoreId: 'internal-world-id',
	firstMessage: 'Internal first message',
};

const makeTurn = (sequence: number): DisplayTurn => ({
	chatTurnId: `internal-turn-${sequence}`,
	sessionId: 'internal-session-id',
	characterId: character.characterId,
	userId: 'internal-user-id',
	profileId: 'internal-profile-id',
	sequence,
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z',
	request: {
		sessionId: 'internal-session-id',
		sequence,
		messageType: 'request',
		role: 'user',
		showName: 'Internal user',
		messageId: `internal-request-${sequence}`,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		emotion: 'neutral',
		type: METADATA_TYPES.MESSAGE,
		model: 'internal-model',
		entries: [{ type: 'dialogue', prompt: `Request ${sequence}` }],
	},
	response: {
		sessionId: 'internal-session-id',
		sequence,
		messageType: 'response',
		role: 'assistant',
		showName: 'Internal character',
		messageId: `internal-response-${sequence}`,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		emotion: 'neutral',
		type: METADATA_TYPES.MESSAGE,
		model: 'internal-model',
		entries: [{ type: 'action', prompt: `Response ${sequence}` }],
	},
});

test('public demo response exposes aliases and message entries only', () => {
	const response = buildPublicDemoResponse(character, { 0: '/assets/demo.webp' }, [makeTurn(1)], {
		title: 'Public title',
		characterName: 'Demo character',
		viewerName: 'Guest',
		maxTurns: 10,
	});

	assert.deepEqual(response, {
		title: 'Public title',
		viewerName: 'Guest',
		character: { showName: 'Demo character', portraitUrl: '/assets/demo.webp' },
		turns: [
			{
				sequence: 1,
				request: [{ type: 'dialogue', prompt: 'Request 1' }],
				response: [{ type: 'action', prompt: 'Response 1' }],
			},
		],
		totalTurnCount: 1,
		truncated: false,
	});
	assert.equal(JSON.stringify(response).includes('internal-'), false);
});

test('public demo response keeps only the configured number of newest turns', () => {
	const response = buildPublicDemoResponse(character, undefined, [makeTurn(1), makeTurn(2)], {
		title: 'Public title',
		characterName: 'Demo character',
		viewerName: 'Guest',
		maxTurns: 1,
	});

	assert.equal(response.turns[0]?.sequence, 2);
	assert.equal(response.totalTurnCount, 2);
	assert.equal(response.truncated, true);
});

test('public demo eligibility rejects unrelated or active sessions', () => {
	const session: SessionInfo = {
		sessionId: 'finance_public_demo_session',
		userId: 'public_demo_user',
		profileId: 'public-demo-profile',
		characterId: 'finance_public_demo',
		title: 'Public demo',
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		messageCount: 1,
		status: 'archived',
		type: METADATA_TYPES.SESSION,
		lastCharMessage: '',
		userNote: '',
	};
	const demoCharacter: CharacterInfo = {
		...character,
		characterId: session.characterId,
		userId: session.userId,
		variant: 'public-demo',
	};

	assert.equal(isDedicatedPublicDemo(session, demoCharacter), true);
	assert.equal(isDedicatedPublicDemo({ ...session, status: 'active' }, demoCharacter), false);
	assert.equal(
		isDedicatedPublicDemo(
			{ ...session, sessionId: 'unrelated_session', userId: 'unrelated-user-id' },
			{ ...demoCharacter, userId: 'unrelated-user-id' }
		),
		false
	);
});
