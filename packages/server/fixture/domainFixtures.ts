import { METADATA_TYPES } from '@rag-advisor-demo/shared/config';
import {
	AssistantDomain,
	CharacterInfo,
	LoreInfo,
	assistantDomainSchema,
	loreStructuredMetadataSchema,
	officialLoreMetadataSchema,
} from '@rag-advisor-demo/shared/domain';
import { buildSessionId, parseSessionId } from '@rag-advisor-demo/shared/util';

import { deepFreeze, DEMO_FIXTURE_DATA_VERSION } from './fixtureUtils.js';
import { FINANCE_CATALOG_FIXTURES } from './financeFixtures.js';
import { FINANCE_REGULATORY_FIXTURES } from './financeRegulatoryFixtures.js';
import { HEALTHCARE_OPERATIONS_FIXTURES } from './healthcareOperationsFixtures.js';

export { DEMO_FIXTURE_DATA_VERSION };
export const DEMO_FIXTURE_OWNER_ID = 'demo-fixture-user';
const FIXTURE_TIMESTAMP = '2026-07-24T00:00:00.000Z';

export type DemoCharacterFixture = {
	fixtureId: string;
	isDemoData: true;
	dataVersion: string;
	character: CharacterInfo & { domain: AssistantDomain };
};

export const DEMO_CHARACTER_FIXTURES = deepFreeze([
	{
		fixtureId: 'finance-assistant',
		isDemoData: true,
		dataVersion: DEMO_FIXTURE_DATA_VERSION,
		character: {
			characterId: 'finance-assistant_demo',
			variant: 'demo',
			contact: '',
			type: METADATA_TYPES.CHARACTER,
			domain: 'finance',
			name: 'finance-assistant',
			gender: 'nocomment',
			title: 'Financial Product Guidance Demo',
			showName: 'Finance Assistant',
			createdAt: FIXTURE_TIMESTAMP,
			updatedAt: FIXTURE_TIMESTAMP,
			userId: DEMO_FIXTURE_OWNER_ID,
			description:
				'A financial-product guidance demo using fictional products and attributed Korean public regulatory sources.',
			worldIntroduction:
				'Products and profiles are fictional demo data. Regulatory education may use attributed Korean public sources.',
			instruction:
				'Provide educational product guidance grounded in eligible evidence. Keep products and profiles fictional, distinguish public regulatory sources from fictional product evidence, cite sources, and never present financial advice or guarantee outcomes.',
			worldLoreId: 'finance-assistant-core_demo-lore',
			firstMessage: 'How can I help you explore the fictional finance demo?',
		},
	},
	{
		fixtureId: 'healthcare-operations-assistant',
		isDemoData: true,
		dataVersion: DEMO_FIXTURE_DATA_VERSION,
		character: {
			characterId: 'healthcare-operations-assistant_demo',
			variant: 'demo',
			contact: '',
			type: METADATA_TYPES.CHARACTER,
			domain: 'healthcare_operations',
			name: 'healthcare-operations-assistant',
			gender: 'nocomment',
			title: 'Healthcare Operations Guidance Demo',
			showName: 'Healthcare Operations Assistant',
			createdAt: FIXTURE_TIMESTAMP,
			updatedAt: FIXTURE_TIMESTAMP,
			userId: DEMO_FIXTURE_OWNER_ID,
			description: 'A fictional healthcare-operations assistant for RAG demonstrations.',
			worldIntroduction:
				'All facilities, roles, workflows, and evidence are fictional operational demo data.',
			instruction:
				'Provide administrative workflow guidance grounded in demo evidence. Do not provide diagnosis, treatment, or medical advice.',
			worldLoreId: 'healthcare-operations-assistant-core_demo-lore',
			firstMessage: 'Which fictional healthcare operations workflow would you like to explore?',
		},
	},
] as const satisfies readonly DemoCharacterFixture[]);

export const DEMO_LORE_FIXTURES = deepFreeze([
	{
		loreId: 'finance-assistant-core_demo-lore',
		userId: DEMO_FIXTURE_OWNER_ID,
		createdAt: FIXTURE_TIMESTAMP,
		updatedAt: FIXTURE_TIMESTAMP,
		title: 'Fictional finance demo guidance',
		generatedTitle: '',
		summary: 'Educational grounding rules for fictional finance products.',
		category: 'Other',
		type: METADATA_TYPES.LORE,
		source: 'repository-fixture',
		content:
			'Use only fictional product evidence. Explain uncertainty, liquidity, time horizon, and risk without guaranteeing outcomes.',
		characterIds: ['finance-assistant_demo'],
		keywordList: ['fictional product', 'risk', 'liquidity'],
		topicList: ['financial product guidance'],
		entityList: [],
		domain: 'finance',
		fixtureId: 'finance-assistant-core',
		isDemoData: true,
		dataVersion: DEMO_FIXTURE_DATA_VERSION,
		dataAsOf: '2026-07-24',
		structuredMetadata: { domain: 'finance', knowledgeType: 'education' },
	},
	{
		loreId: 'healthcare-operations-assistant-core_demo-lore',
		userId: DEMO_FIXTURE_OWNER_ID,
		createdAt: FIXTURE_TIMESTAMP,
		updatedAt: FIXTURE_TIMESTAMP,
		title: 'DEMO — 의료 운영 일반 안내',
		generatedTitle: '',
		summary: '가상 의료기관의 행정 절차에 적용하는 공통 운영 및 안전 원칙.',
		category: 'Other',
		type: METADATA_TYPES.LORE,
		source: 'repository-fixture',
		content:
			'데모 데이터 전용. 서버가 선택한 운영 근거만 사용합니다. 안내 범위는 행정 절차로 제한하며 진단, 치료, 투약, 증상 판단과 의료 조언은 포함하지 않습니다. 임상 결정, 응급 판단, 개인정보 또는 접근 권한의 예외 승인은 반드시 자격을 갖춘 담당자에게 전달합니다.',
		characterIds: ['healthcare-operations-assistant_demo'],
		keywordList: ['의료 운영', '행정 절차', 'healthcare operations', 'administration'],
		topicList: ['의료 운영', 'healthcare operations'],
		entityList: [],
		domain: 'healthcare_operations',
		fixtureId: 'healthcare-operations-assistant-core',
		isDemoData: true,
		dataVersion: DEMO_FIXTURE_DATA_VERSION,
		dataAsOf: '2026-07-24',
		structuredMetadata: {
			domain: 'healthcare_operations',
			knowledgeType: 'operations_guide',
			workflowCode: 'DEMO-OPS-CORE',
			workflowTopic: 'general_operations',
			allowedRequesterRoles: ['nurse', 'doctor', 'admin_staff', 'patient_support'],
			urgencyLevels: ['routine', 'time_sensitive'],
		},
	},
	...FINANCE_REGULATORY_FIXTURES,
] as const satisfies readonly LoreInfo[]);

export type FixtureValidationIssueCode =
	| 'DUPLICATE_CHARACTER_ID'
	| 'DUPLICATE_LORE_ID'
	| 'DUPLICATE_FIXTURE_ID'
	| 'INVALID_CHARACTER_ID'
	| 'UNSUPPORTED_DOMAIN'
	| 'MISSING_FIXTURE_ID'
	| 'MISSING_DEMO_MARKER'
	| 'MISSING_DATA_VERSION'
	| 'INCONSISTENT_DATA_VERSION'
	| 'MISSING_CANONICAL_LORE_CONTENT'
	| 'UNKNOWN_CHARACTER_REFERENCE'
	| 'UNKNOWN_LORE_REFERENCE'
	| 'LORE_CHARACTER_DOMAIN_MISMATCH'
	| 'INVALID_STRUCTURED_METADATA'
	| 'PROHIBITED_FIXTURE_CONTENT';

export type FixtureValidationIssue = {
	code: FixtureValidationIssueCode;
	fixtureId: string;
	message: string;
};

export type FixtureValidationReport = {
	valid: boolean;
	characterCount: number;
	loreCount: number;
	expectedEmbeddingCalls: number;
	issues: FixtureValidationIssue[];
};

export type FixtureValidationInput = {
	characters: readonly DemoCharacterFixture[];
	lores: readonly LoreInfo[];
	dataVersion?: string;
};

const prohibitedContentPatterns = [
	/\b(?:real|actual)\s+(?:person|customer|patient|employee|hospital|institution|organization)\b/i,
	/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
	/\b\d{3}-\d{2}-\d{4}\b/,
	/\b(?:phone|mobile|telephone)\s*[:=]\s*\+?[\d .()-]{7,}\b/i,
];

const collectStrings = (value: unknown): string[] => {
	if (typeof value === 'string') return [value];
	if (Array.isArray(value)) return value.flatMap(collectStrings);
	if (value && typeof value === 'object') {
		return Object.values(value as Record<string, unknown>).flatMap(collectStrings);
	}
	return [];
};

const hasProhibitedContent = (value: unknown): boolean =>
	collectStrings(value).some((text) =>
		prohibitedContentPatterns.some((pattern) => pattern.test(text))
	);

const addIssue = (
	issues: FixtureValidationIssue[],
	code: FixtureValidationIssueCode,
	fixtureId: string,
	message: string
) => {
	issues.push({ code, fixtureId, message });
};

export const validateDomainFixtures = ({
	characters,
	lores,
	dataVersion = DEMO_FIXTURE_DATA_VERSION,
}: FixtureValidationInput): FixtureValidationReport => {
	const issues: FixtureValidationIssue[] = [];
	const characterIds = new Set<string>();
	const characterDomains = new Map<string, AssistantDomain>();
	const fixtureIds = new Set<string>();
	const loreIds = new Set<string>();

	for (const fixture of characters) {
		const { character } = fixture;
		if (!fixture.fixtureId.trim()) {
			addIssue(
				issues,
				'MISSING_FIXTURE_ID',
				character.characterId,
				'Character fixture identity is required.'
			);
		} else if (fixtureIds.has(fixture.fixtureId)) {
			addIssue(
				issues,
				'DUPLICATE_FIXTURE_ID',
				fixture.fixtureId,
				`Fixture ID '${fixture.fixtureId}' is duplicated.`
			);
		} else {
			fixtureIds.add(fixture.fixtureId);
		}
		if (characterIds.has(character.characterId)) {
			addIssue(
				issues,
				'DUPLICATE_CHARACTER_ID',
				fixture.fixtureId,
				`Duplicate Character ID '${character.characterId}'.`
			);
		}
		characterIds.add(character.characterId);

		const parsedDomain = assistantDomainSchema.safeParse(character.domain);
		if (!parsedDomain.success) {
			addIssue(
				issues,
				'UNSUPPORTED_DOMAIN',
				fixture.fixtureId,
				`Unsupported Character domain '${String(character.domain)}'.`
			);
		} else {
			characterDomains.set(character.characterId, parsedDomain.data);
		}

		try {
			const sessionId = buildSessionId(character.characterId);
			if (parseSessionId(sessionId).characterId !== character.characterId) {
				throw new Error('Character ID does not round-trip through Session ID parsing.');
			}
		} catch (error) {
			addIssue(
				issues,
				'INVALID_CHARACTER_ID',
				fixture.fixtureId,
				error instanceof Error ? error.message : 'Invalid Character ID.'
			);
		}

		if (fixture.isDemoData !== true) {
			addIssue(issues, 'MISSING_DEMO_MARKER', fixture.fixtureId, 'Demo marker must be true.');
		}
		if (!fixture.dataVersion) {
			addIssue(issues, 'MISSING_DATA_VERSION', fixture.fixtureId, 'Data version is required.');
		} else if (fixture.dataVersion !== dataVersion) {
			addIssue(
				issues,
				'INCONSISTENT_DATA_VERSION',
				fixture.fixtureId,
				`Expected data version '${dataVersion}', received '${fixture.dataVersion}'.`
			);
		}
		if (hasProhibitedContent(fixture)) {
			addIssue(
				issues,
				'PROHIBITED_FIXTURE_CONTENT',
				fixture.fixtureId,
				'Fixture contains content shaped like personal or non-demo organization data.'
			);
		}
	}

	for (const lore of lores) {
		const fixtureId = lore.fixtureId || lore.loreId;
		if (!lore.fixtureId?.trim()) {
			addIssue(issues, 'MISSING_FIXTURE_ID', lore.loreId, 'Lore fixture identity is required.');
		} else if (fixtureIds.has(lore.fixtureId)) {
			addIssue(
				issues,
				'DUPLICATE_FIXTURE_ID',
				lore.fixtureId,
				`Fixture ID '${lore.fixtureId}' is duplicated.`
			);
		} else {
			fixtureIds.add(lore.fixtureId);
		}
		if (loreIds.has(lore.loreId)) {
			addIssue(issues, 'DUPLICATE_LORE_ID', fixtureId, `Lore ID '${lore.loreId}' is duplicated.`);
		} else {
			loreIds.add(lore.loreId);
		}
		if (!lore.content.trim()) {
			addIssue(
				issues,
				'MISSING_CANONICAL_LORE_CONTENT',
				fixtureId,
				'Canonical Lore content is required.'
			);
		}
		if (lore.isDemoData !== true) {
			addIssue(issues, 'MISSING_DEMO_MARKER', fixtureId, 'Demo marker must be true.');
		}
		if (!lore.dataVersion) {
			addIssue(issues, 'MISSING_DATA_VERSION', fixtureId, 'Data version is required.');
		} else if (lore.dataVersion !== dataVersion) {
			addIssue(
				issues,
				'INCONSISTENT_DATA_VERSION',
				fixtureId,
				`Expected data version '${dataVersion}', received '${lore.dataVersion}'.`
			);
		}

		const structured = loreStructuredMetadataSchema.safeParse(lore.structuredMetadata);
		const officialMetadata = officialLoreMetadataSchema.safeParse({
			domain: lore.domain,
			fixtureId: lore.fixtureId,
			isDemoData: lore.isDemoData,
			dataVersion: lore.dataVersion,
			dataAsOf: lore.dataAsOf,
			structuredMetadata: lore.structuredMetadata,
		});
		if (!structured.success || structured.data.domain !== lore.domain || !officialMetadata.success) {
			addIssue(
				issues,
				'INVALID_STRUCTURED_METADATA',
				fixtureId,
				'Lore structured metadata is invalid or does not match the Lore domain.'
			);
		}

		for (const characterId of lore.characterIds) {
			const characterDomain = characterDomains.get(characterId);
			if (!characterIds.has(characterId)) {
				addIssue(
					issues,
					'UNKNOWN_CHARACTER_REFERENCE',
					fixtureId,
					`Lore references unknown Character '${characterId}'.`
				);
			} else if (characterDomain !== lore.domain) {
				addIssue(
					issues,
					'LORE_CHARACTER_DOMAIN_MISMATCH',
					fixtureId,
					`Lore domain '${String(lore.domain)}' does not match Character domain '${String(characterDomain)}'.`
				);
			}
		}

		if (hasProhibitedContent(lore)) {
			addIssue(
				issues,
				'PROHIBITED_FIXTURE_CONTENT',
				fixtureId,
				'Fixture contains content shaped like personal or non-demo organization data.'
			);
		}
	}

	const loreById = new Map(lores.map((lore) => [lore.loreId, lore]));
	for (const fixture of characters) {
		const { character } = fixture;
		const linkedLore = loreById.get(character.worldLoreId);
		if (!linkedLore || !linkedLore.characterIds.includes(character.characterId)) {
			addIssue(
				issues,
				'UNKNOWN_LORE_REFERENCE',
				fixture.fixtureId,
				`Character world Lore '${character.worldLoreId}' is missing or does not link back to '${character.characterId}'.`
			);
		}
	}

	return {
		valid: issues.length === 0,
		characterCount: characters.length,
		loreCount: lores.length,
		expectedEmbeddingCalls: lores.length,
		issues,
	};
};

export const validateBuiltInDomainFixtures = (): FixtureValidationReport =>
	validateDomainFixtures({
		characters: DEMO_CHARACTER_FIXTURES,
		lores: [
			...DEMO_LORE_FIXTURES,
			...FINANCE_CATALOG_FIXTURES.map(({ lore }) => lore),
			...HEALTHCARE_OPERATIONS_FIXTURES.map(({ lore }) => lore),
		],
	});
