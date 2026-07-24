import { PublicDemoResponse } from '@rag-advisor-demo/shared/api';
import { CharacterInfo, DisplayTurn, SessionInfo } from '@rag-advisor-demo/shared/domain';
import { PortraitUrlMap } from '@rag-advisor-demo/shared/config';
import { getServerEnv } from '../config/env.js';
import { characterStore } from '../store/characterStore.js';
import { chatStore } from '../store/chatStore.js';
import { sessionStore } from '../store/sessionStore.js';

type PublicDemoOptions = {
	title: string;
	characterName: string;
	viewerName: string;
	maxTurns: number;
};

const getDefaultPortrait = (portraits?: PortraitUrlMap) => portraits?.[0];

export const isDedicatedPublicDemo = (session: SessionInfo, character: CharacterInfo): boolean =>
	session.status === 'archived' &&
	session.sessionId.includes('public_demo') &&
	session.userId.startsWith('public_demo_') &&
	character.variant === 'public-demo' &&
	character.characterId.includes('public_demo') &&
	character.userId === session.userId &&
	character.characterId === session.characterId;

export const buildPublicDemoResponse = (
	character: CharacterInfo,
	portraits: PortraitUrlMap | undefined,
	turns: DisplayTurn[],
	options: PublicDemoOptions
): PublicDemoResponse => {
	const visibleTurns = turns.slice(-options.maxTurns);

	return {
		title: options.title,
		viewerName: options.viewerName,
		character: { showName: options.characterName, portraitUrl: getDefaultPortrait(portraits) },
		turns: visibleTurns.map((turn) => ({
			sequence: turn.sequence,
			request: turn.request.entries.map(({ type, prompt }) => ({ type, prompt })),
			response: turn.response.entries.map(({ type, prompt }) => ({ type, prompt })),
		})),
		totalTurnCount: turns.length,
		truncated: visibleTurns.length < turns.length,
	};
};

export const getPublicDemo = async (): Promise<PublicDemoResponse | null> => {
	const env = getServerEnv();
	if (!env.PUBLIC_DEMO_ENABLED || !env.PUBLIC_DEMO_SESSION_ID) {
		return null;
	}

	const sessionResponse = await sessionStore.getSession(env.PUBLIC_DEMO_SESSION_ID);
	const session = sessionResponse.sessionInfo;
	const characterResponse = await characterStore.getCharacter(session.characterId);
	if (!isDedicatedPublicDemo(session, characterResponse.characterInfo)) {
		return null;
	}

	const chatResponse = await chatStore.getAllDisplayTurns(session.sessionId);

	return buildPublicDemoResponse(
		characterResponse.characterInfo,
		characterResponse.characterPortraits[session.characterId],
		chatResponse.displayTurns,
		{
			title: env.PUBLIC_DEMO_TITLE,
			characterName: env.PUBLIC_DEMO_CHARACTER_NAME,
			viewerName: env.PUBLIC_DEMO_VIEWER_NAME,
			maxTurns: env.PUBLIC_DEMO_MAX_TURNS,
		}
	);
};
