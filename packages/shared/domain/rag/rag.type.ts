import type { AssistantDomain } from '../character/character.type.js';
import type { DocumentOrigin } from '../document/document.type.js';
import type { PublicSourceAttribution } from '../lore/lore.type.js';

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
	'invalid_structured_metadata',
	'horizon_mismatch',
	'liquidity_mismatch',
	'risk_mismatch',
	'requester_role_mismatch',
	'workflow_topic_mismatch',
	'urgency_mismatch',
] as const;

export const RAG_STRUCTURED_FILTER_DECISIONS = ['eligible', 'excluded'] as const;

export type RagEvidenceSourceKind = (typeof RAG_EVIDENCE_SOURCE_KINDS)[number];
export type RagExclusionReason = (typeof RAG_EXCLUSION_REASONS)[number];
export type RagStructuredFilterDecisionType = (typeof RAG_STRUCTURED_FILTER_DECISIONS)[number];

export interface RagEvidenceItem {
	sourceKind: RagEvidenceSourceKind;
	sourceId: string;
	label: string;
	domain: AssistantDomain;
	origin?: DocumentOrigin;
	publicSource?: PublicSourceAttribution;
	chatMemory?: { sequence: number; requestText: string; responseText: string };
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

export interface RagStructuredFilterDecision {
	sourceId: string;
	label: string;
	decision: RagStructuredFilterDecisionType;
	reasons: RagExclusionReason[];
}

export interface RagEvidenceDto {
	domain: AssistantDomain;
	characterId: string;
	sessionId: string;
	profileFieldsUsed: string[];
	items: RagEvidenceItem[];
	excluded: RagExcludedEvidenceSummary[];
	structuredFilterDecisions: RagStructuredFilterDecision[];
	missingInformation: RagMissingInformation[];
	assumptions: RagContextAssumption[];
}
