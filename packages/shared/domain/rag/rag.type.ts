import type { AssistantDomain } from '../character/character.type.js';
import type { DocumentOrigin } from '../document/document.type.js';

export const RAG_EVIDENCE_SOURCE_KINDS = [
	'chat_memory',
	'character_lore',
	'session_document',
] as const;

export const RAG_EXCLUSION_REASONS = [
	'ownership_mismatch',
	'session_mismatch',
	'character_mismatch',
	'domain_mismatch',
	'missing_domain',
	'not_retrieval_eligible',
] as const;

export type RagEvidenceSourceKind = (typeof RAG_EVIDENCE_SOURCE_KINDS)[number];
export type RagExclusionReason = (typeof RAG_EXCLUSION_REASONS)[number];

export interface RagEvidenceItem {
	sourceKind: RagEvidenceSourceKind;
	sourceId: string;
	label: string;
	domain: AssistantDomain;
	origin?: DocumentOrigin;
	relevanceScore?: number;
}

export interface RagExcludedEvidenceSummary {
	sourceKind: RagEvidenceSourceKind;
	reason: RagExclusionReason;
	count: number;
}

export interface RagMissingInformation {
	source: 'session_profile';
	field: string;
}

export interface RagContextAssumption {
	source: 'current_request' | 'default';
	description: string;
}

export interface RagEvidenceDto {
	domain: AssistantDomain;
	characterId: string;
	sessionId: string;
	profileFieldsUsed: string[];
	items: RagEvidenceItem[];
	excluded: RagExcludedEvidenceSummary[];
	missingInformation: RagMissingInformation[];
	assumptions: RagContextAssumption[];
}
