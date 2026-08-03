import type { ChatEntry } from '@rag-advisor-demo/shared/domain';

/**
 * The portfolio workspace presents chat as plain prose. Entry types remain in
 * storage and API requests, but legacy action delimiters are not reintroduced.
 */
export const formatWorkspaceEntries = (entries: readonly ChatEntry[]): string =>
	entries.map(({ prompt }) => prompt).join('\n');
