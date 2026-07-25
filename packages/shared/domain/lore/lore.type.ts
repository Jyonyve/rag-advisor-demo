// src/shared/domain/lore/LoreInterfaces.ts

import { METADATA_TYPES } from '../../config/index.js';
import { AssistantDomain, assistantDomainSchema } from '../character/character.type.js';
import { z } from 'zod';

export const financeLoreStructuredMetadataSchema = z
	.object({
		domain: z.literal('finance'),
		knowledgeType: z.enum(['product', 'disclosure', 'education']),
		riskLevel: z.enum(['low', 'medium', 'high']).optional(),
		minimumHorizonMonths: z.number().int().nonnegative().optional(),
		liquidityLevel: z.enum(['low', 'medium', 'high']).optional(),
		productCode: z.string().trim().min(1).optional(),
		productFixtureId: z.string().trim().min(1).optional(),
		disclosureCode: z.string().trim().min(1).optional(),
	})
	.strict()
	.superRefine((metadata, context) => {
		if (metadata.knowledgeType === 'product') {
			for (const field of [
				'riskLevel',
				'minimumHorizonMonths',
				'liquidityLevel',
				'productCode',
			] as const) {
				if (metadata[field] === undefined) {
					context.addIssue({
						code: 'custom',
						path: [field],
						message: `Finance product metadata requires ${field}.`,
					});
				}
			}
		}
		if (metadata.knowledgeType === 'disclosure') {
			for (const field of ['productFixtureId', 'disclosureCode'] as const) {
				if (metadata[field] === undefined) {
					context.addIssue({
						code: 'custom',
						path: [field],
						message: `Finance disclosure metadata requires ${field}.`,
					});
				}
			}
		}
	});

export const healthcareOperationsLoreStructuredMetadataSchema = z
	.object({
		domain: z.literal('healthcare_operations'),
		knowledgeType: z.enum(['workflow', 'policy', 'operations_guide']),
		workflowCode: z.string().trim().min(1),
		workflowTopic: z.enum([
			'general_operations',
			'appointment_rescheduling',
			'admission_discharge',
			'records_privacy',
			'billing_inquiry',
			'his_access',
		]),
		allowedRequesterRoles: z
			.array(z.enum(['nurse', 'doctor', 'admin_staff', 'patient_support']))
			.min(1),
		urgencyLevels: z.array(z.enum(['routine', 'time_sensitive'])).min(1),
	})
	.strict();

export const loreStructuredMetadataSchema = z.discriminatedUnion('domain', [
	financeLoreStructuredMetadataSchema,
	healthcareOperationsLoreStructuredMetadataSchema,
]);

export type LoreStructuredMetadata = z.infer<typeof loreStructuredMetadataSchema>;

export const officialLoreMetadataSchema = z
	.object({
		domain: assistantDomainSchema,
		fixtureId: z.string().trim().min(1),
		isDemoData: z.literal(true),
		dataVersion: z.string().trim().min(1),
		dataAsOf: z.iso.date().optional(),
		structuredMetadata: loreStructuredMetadataSchema,
	})
	.strict()
	.superRefine((metadata, context) => {
		if (metadata.domain !== metadata.structuredMetadata.domain) {
			context.addIssue({
				code: 'custom',
				path: ['structuredMetadata', 'domain'],
				message: 'Structured Lore metadata domain must match the Lore domain.',
			});
		}
	});

export type OfficialLoreMetadata = z.infer<typeof officialLoreMetadataSchema>;

export type LoreIndexContentType =
	| 'AFFECTED_CHARACTER'
	| 'KEYWORD'
	| 'TOPIC'
	| 'ENTITY'
	| 'RELATED_EVENT';

export type LoreCategory =
	| 'World' // NEW: Used exclusively for world lore
	| 'Mythology' // Legends, creation stories, religious beliefs
	| 'Item' // Magical items, artifacts, important objects
	| 'Concept' // Abstract ideas, philosophies, systems
	| 'Organization' // Groups, factions, institutions
	| 'Character' // Important NPCs, legendary figures
	| 'Location' // Places, regions, landmarks
	| 'Event' // Historical events, disasters, celebrations
	| 'Culture' // Customs, traditions, social norms
	| 'Magic' // Spells, magical phenomena, arcane knowledge
	| 'History' // Historical records, timelines
	| 'Technology' // Inventions, crafts, techniques
	| 'Politics' // Government systems, laws, treaties
	| 'Other'; // Fallback for unique cases

// --- 1. PRIMARY DOCUMENT METADATA (Lean, no arrays) ---
interface BaseLoreMetadata {
	loreId: string;
	userId: string;
	/** When present, this lore is visible only inside the specified session. */
	sessionId?: string;
	createdAt: string;
	updatedAt: string;
	title: string;
	generatedTitle: string;
	summary: string;
	category: LoreCategory; // Now ALL lore has category (world lore uses 'World')
	/** Required and validated when Lore is persisted as official Character documentation. */
	domain?: AssistantDomain;
	fixtureId?: string;
	isDemoData?: boolean;
	dataVersion?: string;
	dataAsOf?: string;
	structuredMetadata?: LoreStructuredMetadata;
}

// World Lore: Shared world-building content
export interface WorldLoreMetadata extends BaseLoreMetadata {
	type: typeof METADATA_TYPES.WORLD;
	category: 'World'; // Always 'World' for world lore
}

// Misc Lore: Character-specific miscellaneous information
export interface MiscLoreMetadata extends BaseLoreMetadata {
	type: typeof METADATA_TYPES.LORE;
	category: Exclude<LoreCategory, 'World'>; // Any category except 'World'
	source: string;
}

// --- 2. SEARCH INDEX METADATA (Clean, all required fields) ---
export interface LoreIndexMetadata {
	type: typeof METADATA_TYPES.INDEX;
	contentType: LoreIndexContentType;
	loreId: string; // Foreign key to primary lore document
	value: string; // The actual keyword/topic/entity/characterId value
	userId: string; // For user-specific filtering
	category: LoreCategory; // Always present - 'World' for world lore, others for misc lore
	originalCreatedAt: string; // For sorting/filtering by date
}

// --- 3. RICH APPLICATION-LEVEL INTERFACES ---
// World Lore Info: Complete object with reconstructed arrays
export interface WorldLoreInfo extends WorldLoreMetadata {
	content: string; // From document

	// Arrays reconstructed from index records
	characterIds: string[]; // From 'AFFECTED_CHARACTER' index records
	keywordList: string[]; // From 'KEYWORD' index records
	topicList: string[]; // From 'TOPIC' index records
	entityList: string[]; // From 'ENTITY' index records
}

// Misc Lore Info: Complete object with reconstructed arrays
export interface MiscLoreInfo extends MiscLoreMetadata {
	content: string; // From document

	// Arrays reconstructed from index records
	characterIds: string[]; // From 'AFFECTED_CHARACTER' index records
	keywordList: string[]; // From 'KEYWORD' index records
	topicList: string[]; // From 'TOPIC' index records
	entityList: string[]; // From 'ENTITY' index records
}

// --- CDO TYPES ---
export type WorldLoreCdo = Pick<
	WorldLoreInfo,
	'content' | 'title' | 'userId' | 'characterIds' | 'category' | 'sessionId'
>;
export type MiscLoreCdo = Pick<
	MiscLoreInfo,
	'content' | 'title' | 'userId' | 'characterIds' | 'sessionId'
>;

// Union types for easier handling
export type LoreMetadata = WorldLoreMetadata | MiscLoreMetadata;
export type LoreInfo = WorldLoreInfo | MiscLoreInfo;
export type LoreCdo = WorldLoreCdo | MiscLoreCdo;
