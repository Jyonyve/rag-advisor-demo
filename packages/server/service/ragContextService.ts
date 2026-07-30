import type { MemoryResponse } from '@rag-advisor-demo/shared/api';
import {
	ApiError,
	type AssistantDomain,
	type CharacterInfo,
	type ChatTurn,
	type DocumentInfo,
	type DomainSessionProfile,
	type LoreInfo,
	type ProfileInfo,
	type RagEvidenceDto,
	type RagEvidenceItem,
	type RagEvidenceSourceKind,
	type RagExcludedEvidenceSummary,
	type RagExclusionReason,
	type RagMissingInformation,
	type RagStructuredFilterDecision,
} from '@rag-advisor-demo/shared/domain';
import { parseSessionId, serializeChatEntries } from '@rag-advisor-demo/shared/util';

import {
	parseDomainProfileForCharacter,
	parseRequiredAssistantDomain,
} from '../util/domainValidationUtils.js';
import { filterFinanceLore } from './financeProductFilter.js';
import { filterHealthcareOperationsLore } from './healthcareOperationsFilter.js';
import { isOfficialDemoCharacter } from './officialDemoFixtures.js';

export interface ResolveRagContextInput {
	sessionId: string;
	userId: string;
	currentMessage: string;
	character: CharacterInfo;
	profile: ProfileInfo;
	memories: MemoryResponse;
}

export interface ResolvedRagContext {
	domain: AssistantDomain;
	characterId: string;
	sessionId: string;
	currentMessage: string;
	sessionProfile: DomainSessionProfile;
	memories: MemoryResponse;
	evidence: RagEvidenceDto;
}

type ExclusionCounter = Map<string, RagExcludedEvidenceSummary>;

const PROFILE_FIELDS: Record<AssistantDomain, readonly string[]> = {
	finance: ['investmentGoal', 'investmentHorizonMonths', 'liquidityNeed', 'riskPreference'],
	healthcare_operations: ['workflowTopic', 'requesterRole', 'urgency'],
};

const addExclusion = (
	exclusions: ExclusionCounter,
	sourceKind: RagEvidenceSourceKind,
	reason: RagExclusionReason
): void => {
	const key = `${sourceKind}:${reason}`;
	const current = exclusions.get(key);
	exclusions.set(key, { sourceKind, reason, count: (current?.count ?? 0) + 1 });
};

const getChatExclusion = (
	turn: ChatTurn,
	userId: string,
	sessionId: string
): RagExclusionReason | undefined => {
	if (turn.userId !== userId) return 'ownership_mismatch';
	if (turn.sessionId !== sessionId) return 'session_mismatch';
	return undefined;
};

const getLoreExclusion = (
	lore: LoreInfo,
	userId: string,
	sessionId: string,
	characterId: string,
	characterOwnerId: string,
	domain: AssistantDomain
): RagExclusionReason | undefined => {
	const readableOfficialLore =
		isOfficialDemoCharacter(characterId) && lore.userId === characterOwnerId;
	if (lore.userId !== userId && !readableOfficialLore) {
		return 'ownership_mismatch';
	}
	if (lore.sessionId && lore.sessionId !== sessionId) return 'session_mismatch';
	if (!lore.characterIds.includes(characterId)) return 'character_mismatch';
	if (!lore.domain) return 'missing_domain';
	if (lore.domain !== domain) return 'domain_mismatch';
	return undefined;
};

const getDocumentExclusion = (
	document: DocumentInfo,
	userId: string,
	sessionId: string,
	characterId: string
): RagExclusionReason | undefined => {
	if (document.userId !== userId) return 'ownership_mismatch';
	if (document.sessionId !== sessionId) return 'session_mismatch';
	if (document.characterId !== characterId) return 'character_mismatch';
	if (
		document.status !== 'approved' ||
		!document.retrievalEnabled ||
		document.includeInRag !== true
	) {
		return 'not_retrieval_eligible';
	}
	return undefined;
};

const filterChatTurns = (
	turns: readonly ChatTurn[],
	userId: string,
	sessionId: string,
	exclusions: ExclusionCounter
): ChatTurn[] =>
	turns.filter((turn) => {
		const reason = getChatExclusion(turn, userId, sessionId);
		if (reason) addExclusion(exclusions, 'chat_memory', reason);
		return !reason;
	});

const filterLores = (
	lores: readonly LoreInfo[],
	userId: string,
	sessionId: string,
	characterId: string,
	characterOwnerId: string,
	domain: AssistantDomain,
	exclusions: ExclusionCounter
): LoreInfo[] =>
	lores.filter((lore) => {
		const reason = getLoreExclusion(lore, userId, sessionId, characterId, characterOwnerId, domain);
		if (reason) addExclusion(exclusions, 'character_lore', reason);
		return !reason;
	});

const filterDocuments = (
	documents: readonly DocumentInfo[],
	userId: string,
	sessionId: string,
	characterId: string,
	exclusions: ExclusionCounter
): DocumentInfo[] =>
	documents.filter((document) => {
		const reason = getDocumentExclusion(document, userId, sessionId, characterId);
		if (reason) addExclusion(exclusions, 'session_document', reason);
		return !reason;
	});

const getProfileContext = (
	profile: DomainSessionProfile
): { fieldsUsed: string[]; missingInformation: RagMissingInformation[] } => {
	const fields = PROFILE_FIELDS[profile.domain];
	const record = profile as unknown as Record<string, unknown>;
	const fieldsUsed = fields.filter((field) => record[field] !== undefined);
	const missingInformation = fields
		.filter((field) => record[field] === undefined)
		.map((field) => ({ source: 'session_profile' as const, field }));
	return { fieldsUsed: ['domain', ...fieldsUsed], missingInformation };
};

const buildEvidenceItems = (
	domain: AssistantDomain,
	longTermHistory: readonly ChatTurn[],
	lores: readonly LoreInfo[],
	documents: readonly DocumentInfo[]
): RagEvidenceItem[] => [
	...longTermHistory.map((turn) => ({
		sourceKind: 'chat_memory' as const,
		sourceId: turn.chatTurnId,
		label: `Chat memory ${turn.sequence}`,
		domain,
		chatMemory: {
			sequence: turn.sequence,
			requestText: serializeChatEntries(turn.request?.entries ?? [], 'asterisk-actions'),
			responseText: serializeChatEntries(turn.response?.entries ?? [], 'asterisk-actions'),
		},
	})),
	...lores.map((lore) => ({
		sourceKind: 'character_lore' as const,
		sourceId: lore.loreId,
		label: lore.title || lore.generatedTitle || 'Character Lore',
		domain,
		...(lore.structuredMetadata?.domain === 'finance' && lore.structuredMetadata.publicSource
			? { publicSource: lore.structuredMetadata.publicSource }
			: {}),
	})),
	...documents.map((document) => ({
		sourceKind: 'session_document' as const,
		sourceId: document.documentId,
		label: document.title,
		domain,
		origin: document.origin,
	})),
];

export const resolveRagContext = (input: ResolveRagContextInput): ResolvedRagContext => {
	const domain = parseRequiredAssistantDomain(input.character.domain);
	const parsedSession = parseSessionId(input.sessionId);
	if (parsedSession.characterId !== input.character.characterId) {
		throw new ApiError(400, 'Session Character does not match the selected Character.');
	}
	if (
		input.character.userId !== input.userId &&
		!isOfficialDemoCharacter(input.character.characterId)
	) {
		throw new ApiError(403, 'Selected Character is not owned by the authenticated user.');
	}
	if (input.profile.userId !== input.userId || input.profile.sessionId !== input.sessionId) {
		throw new ApiError(403, 'Session Profile ownership or scope does not match the request.');
	}
	const sessionProfile = parseDomainProfileForCharacter(input.profile.domainProfile, domain);
	const exclusions: ExclusionCounter = new Map();
	const shortTermHistory = filterChatTurns(
		input.memories.shortTermHistory,
		input.userId,
		input.sessionId,
		exclusions
	);
	const longTermHistory = filterChatTurns(
		input.memories.longTermHistory,
		input.userId,
		input.sessionId,
		exclusions
	);
	let relevantLore = filterLores(
		input.memories.relevantLore,
		input.userId,
		input.sessionId,
		input.character.characterId,
		input.character.userId,
		domain,
		exclusions
	);
	let structuredFilterDecisions: RagStructuredFilterDecision[] = [];
	let assumptions: RagEvidenceDto['assumptions'] = [];
	if (sessionProfile.domain === 'finance') {
		const financeFilter = filterFinanceLore(relevantLore, sessionProfile, input.currentMessage);
		relevantLore = financeFilter.eligibleLore;
		structuredFilterDecisions = financeFilter.decisions;
		assumptions = financeFilter.assumptions;
		for (const decision of financeFilter.decisions) {
			if (decision.decision !== 'excluded') continue;
			for (const reason of decision.reasons) {
				addExclusion(exclusions, 'character_lore', reason);
			}
		}
	} else if (sessionProfile.domain === 'healthcare_operations') {
		const healthcareFilter = filterHealthcareOperationsLore(
			relevantLore,
			sessionProfile,
			input.currentMessage
		);
		relevantLore = healthcareFilter.eligibleLore;
		structuredFilterDecisions = healthcareFilter.decisions;
		assumptions = healthcareFilter.assumptions;
		for (const decision of healthcareFilter.decisions) {
			if (decision.decision !== 'excluded') continue;
			for (const reason of decision.reasons) {
				addExclusion(exclusions, 'character_lore', reason);
			}
		}
	}
	const relevantDocuments = filterDocuments(
		input.memories.relevantDocuments ?? [],
		input.userId,
		input.sessionId,
		input.character.characterId,
		exclusions
	);
	const profileContext = getProfileContext(sessionProfile);
	const memories: MemoryResponse = {
		...input.memories,
		shortTermHistory,
		longTermHistory,
		relevantLore,
		relevantDocuments,
	};

	return {
		domain,
		characterId: input.character.characterId,
		sessionId: input.sessionId,
		currentMessage: input.currentMessage,
		sessionProfile,
		memories,
		evidence: {
			domain,
			characterId: input.character.characterId,
			sessionId: input.sessionId,
			profileFieldsUsed: profileContext.fieldsUsed,
			items: buildEvidenceItems(domain, longTermHistory, relevantLore, relevantDocuments),
			excluded: [...exclusions.values()],
			structuredFilterDecisions,
			missingInformation: profileContext.missingInformation,
			assumptions,
		},
	};
};
