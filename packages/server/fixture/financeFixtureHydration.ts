import type { FinanceCatalogFixture, FinanceEmbeddingFixtureMetadata } from './financeFixtures.js';
import { FINANCE_CATALOG_FIXTURES, FINANCE_EMBEDDING_FIXTURE_METADATA } from './financeFixtures.js';
import { DEMO_FIXTURE_DATA_VERSION } from './fixtureUtils.js';

export type FinanceHydrationIssueCode =
	| 'UNKNOWN_FIXTURE_ID'
	| 'DUPLICATE_FIXTURE_ID'
	| 'DUPLICATE_EMBEDDING_FIXTURE_ID'
	| 'DATA_VERSION_MISMATCH'
	| 'MISSING_CANONICAL_FIXTURE_BODY'
	| 'NONEXISTENT_EMBEDDING_ENTITY'
	| 'EMBEDDING_ENTITY_KIND_MISMATCH'
	| 'NONEXISTENT_DISCLOSURE_PRODUCT';

export interface FinanceHydrationIssue {
	code: FinanceHydrationIssueCode;
	fixtureId: string;
	message: string;
}

export interface HydratedFinanceEmbeddingFixture {
	metadata: FinanceEmbeddingFixtureMetadata;
	fixture: FinanceCatalogFixture;
	entity: FinanceCatalogFixture;
}

export interface FinanceHydrationReport {
	ok: boolean;
	dataVersion: string;
	hydrated: HydratedFinanceEmbeddingFixture[];
	issues: FinanceHydrationIssue[];
}

export interface FinanceHydrationInput {
	fixtures?: readonly FinanceCatalogFixture[];
	embeddingMetadata?: readonly FinanceEmbeddingFixtureMetadata[];
	dataVersion?: string;
}

const addIssue = (
	issues: FinanceHydrationIssue[],
	code: FinanceHydrationIssueCode,
	fixtureId: string,
	message: string
): void => {
	issues.push({ code, fixtureId, message });
};

export const hydrateFinanceCatalogFixtures = ({
	fixtures = FINANCE_CATALOG_FIXTURES,
	embeddingMetadata = FINANCE_EMBEDDING_FIXTURE_METADATA,
	dataVersion = DEMO_FIXTURE_DATA_VERSION,
}: FinanceHydrationInput = {}): FinanceHydrationReport => {
	const issues: FinanceHydrationIssue[] = [];
	const fixtureById = new Map<string, FinanceCatalogFixture>();
	const duplicateFixtureIds = new Set<string>();

	for (const fixture of fixtures) {
		if (fixtureById.has(fixture.fixtureId)) {
			duplicateFixtureIds.add(fixture.fixtureId);
			addIssue(
				issues,
				'DUPLICATE_FIXTURE_ID',
				fixture.fixtureId,
				`Finance fixture ID '${fixture.fixtureId}' is duplicated.`
			);
			continue;
		}
		fixtureById.set(fixture.fixtureId, fixture);
		if (fixture.dataVersion !== dataVersion || fixture.lore.dataVersion !== dataVersion) {
			addIssue(
				issues,
				'DATA_VERSION_MISMATCH',
				fixture.fixtureId,
				`Finance fixture '${fixture.fixtureId}' does not match data version '${dataVersion}'.`
			);
		}
		if (!fixture.lore.content.trim()) {
			addIssue(
				issues,
				'MISSING_CANONICAL_FIXTURE_BODY',
				fixture.fixtureId,
				`Finance fixture '${fixture.fixtureId}' has no canonical Lore body.`
			);
		}
	}

	for (const fixture of fixtures) {
		if (fixture.kind !== 'disclosure' || !fixture.productFixtureId) continue;
		const product = fixtureById.get(fixture.productFixtureId);
		if (!product || product.kind !== 'product') {
			addIssue(
				issues,
				'NONEXISTENT_DISCLOSURE_PRODUCT',
				fixture.fixtureId,
				`Disclosure '${fixture.fixtureId}' references missing product '${fixture.productFixtureId}'.`
			);
		}
	}

	const embeddingIds = new Set<string>();
	const hydrated: HydratedFinanceEmbeddingFixture[] = [];
	for (const metadata of embeddingMetadata) {
		if (embeddingIds.has(metadata.embeddingFixtureId)) {
			addIssue(
				issues,
				'DUPLICATE_EMBEDDING_FIXTURE_ID',
				metadata.embeddingFixtureId,
				`Embedding fixture ID '${metadata.embeddingFixtureId}' is duplicated.`
			);
			continue;
		}
		embeddingIds.add(metadata.embeddingFixtureId);
		if (metadata.dataVersion !== dataVersion) {
			addIssue(
				issues,
				'DATA_VERSION_MISMATCH',
				metadata.embeddingFixtureId,
				`Embedding fixture '${metadata.embeddingFixtureId}' does not match data version '${dataVersion}'.`
			);
		}
		const fixture = fixtureById.get(metadata.loreFixtureId);
		if (!fixture || duplicateFixtureIds.has(metadata.loreFixtureId)) {
			addIssue(
				issues,
				'UNKNOWN_FIXTURE_ID',
				metadata.embeddingFixtureId,
				`Embedding metadata references unknown Lore fixture '${metadata.loreFixtureId}'.`
			);
			continue;
		}
		const entity = fixtureById.get(metadata.entityFixtureId);
		if (!entity) {
			addIssue(
				issues,
				'NONEXISTENT_EMBEDDING_ENTITY',
				metadata.embeddingFixtureId,
				`Embedding metadata references nonexistent ${metadata.entityKind} '${metadata.entityFixtureId}'.`
			);
			continue;
		}
		if (entity.kind !== metadata.entityKind) {
			addIssue(
				issues,
				'EMBEDDING_ENTITY_KIND_MISMATCH',
				metadata.embeddingFixtureId,
				`Embedding entity '${metadata.entityFixtureId}' is not a ${metadata.entityKind}.`
			);
			continue;
		}
		hydrated.push({ metadata, fixture, entity });
	}

	return { ok: issues.length === 0, dataVersion, hydrated, issues };
};
