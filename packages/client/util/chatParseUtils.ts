import { ChatEntry } from '@rag-advisor-demo/shared/domain';
import { parseChatEntries, serializeChatEntries } from '@rag-advisor-demo/shared/util';

export const parseTextToEntries = (text: string): ChatEntry[] =>
	parseChatEntries(text, 'asterisk-actions');

export const parseEntriesToText = (entries: ChatEntry[]): string =>
	serializeChatEntries(entries, 'asterisk-actions');
