import { EmotionValue, DEFAULT_EMOTION } from '@rag-advisor-demo/shared/config';
import {
	ChatEntry,
	ChatRoleType,
	ChatMessage,
	ChatMessageType,
} from '@rag-advisor-demo/shared/domain';
import { parseChatEntries, serializeChatEntries } from '@rag-advisor-demo/shared/util';

export const parseEntriesToConversation = (entries: ChatEntry[]): string =>
	serializeChatEntries(entries, 'quoted-dialogue');

export const parseConversationToEntries = (text: string): ChatEntry[] =>
	parseChatEntries(text, 'quoted-dialogue');

export const buildChatMessageFromEntries = (
	role: ChatRoleType,
	sequence: number,
	showName: string,
	entries: ChatEntry[],
	sessionId: string,
	emotion?: EmotionValue,
	model?: string
): ChatMessage => {
	const messageType: ChatMessageType = role === 'user' ? 'request' : 'response';
	return {
		role,
		sequence,
		sessionId,
		entries,
		messageId: '',
		messageType,
		showName,
		emotion: emotion || DEFAULT_EMOTION,
		createdAt: '',
		updatedAt: '',
		type: 'message',
		model: model || '',
	};
};

export const buildChatMessage = (
	role: ChatRoleType,
	sequence: number,
	showName: string,
	entriesString: string,
	sessionId: string,
	emotion?: EmotionValue,
	model?: string
): ChatMessage => {
	const entries = parseConversationToEntries(entriesString);
	return buildChatMessageFromEntries(role, sequence, showName, entries, sessionId, emotion, model);
};
