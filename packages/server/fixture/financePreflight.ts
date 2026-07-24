import {
	DEMO_CHARACTER_FIXTURES,
	DEMO_LORE_FIXTURES,
	validateBuiltInDomainFixtures,
} from './domainFixtures.js';
import { FINANCE_CATALOG_FIXTURES, FINANCE_EMBEDDING_FIXTURE_METADATA } from './financeFixtures.js';
import { hydrateFinanceCatalogFixtures } from './financeFixtureHydration.js';
import { DEMO_FIXTURE_DATA_VERSION } from './fixtureUtils.js';

export interface FinanceFixturePreflightReport {
	mode: 'dry-run';
	dataVersion: string;
	safety: {
		databaseConnectionAttempted: false;
		databaseWritesAttempted: false;
		embeddingProviderCallsAttempted: false;
		llmProviderCallsAttempted: false;
	};
	databaseInspection: { performed: false; existingRecordCounts: 'not_inspected'; reason: string };
	plannedOperations: {
		characterUpserts: string[];
		loreUpserts: string[];
		documentUpserts: string[];
	};
	plannedEmbeddings: {
		replacementJobs: number;
		bySourceType: { lore: number; document: number };
		sourceIds: string[];
		knownSkips: number;
		databaseDependentSkips: 'not_inspected';
		maximumProviderCallsIfNoExistingHashesMatch: number;
	};
	localStableIdCollisions: string[];
	validationFailures: Array<{ code: string; fixtureId: string; message: string }>;
}

export const buildFinanceFixturePreflightReport = (): FinanceFixturePreflightReport => {
	const financeCharacter = DEMO_CHARACTER_FIXTURES.find(
		({ character }) => character.domain === 'finance'
	);
	const financeCoreLores = DEMO_LORE_FIXTURES.filter(({ domain }) => domain === 'finance');
	const catalogLores = FINANCE_CATALOG_FIXTURES.map(({ lore }) => lore);
	const allFinanceLores = [...financeCoreLores, ...catalogLores];
	const hydration = hydrateFinanceCatalogFixtures();
	const domainValidation = validateBuiltInDomainFixtures();
	const allValidationIssues = [...hydration.issues, ...domainValidation.issues];
	const duplicateIds = [
		...new Set(
			allValidationIssues
				.filter(
					({ code }) =>
						code === 'DUPLICATE_FIXTURE_ID' ||
						code === 'DUPLICATE_EMBEDDING_FIXTURE_ID' ||
						code === 'DUPLICATE_CHARACTER_ID' ||
						code === 'DUPLICATE_LORE_ID'
				)
				.map(({ fixtureId }) => fixtureId)
		),
	];
	const validationFailures: Array<{ code: string; fixtureId: string; message: string }> = [
		...allValidationIssues,
	];
	if (!financeCharacter) {
		validationFailures.push({
			code: 'MISSING_FINANCE_CHARACTER',
			fixtureId: 'finance-assistant',
			message: 'The deterministic Finance Character fixture is missing.',
		});
	}
	if (FINANCE_EMBEDDING_FIXTURE_METADATA.length !== catalogLores.length) {
		validationFailures.push({
			code: 'EMBEDDING_MANIFEST_COUNT_MISMATCH',
			fixtureId: 'finance-embedding-manifest',
			message: 'Each finance catalog Lore fixture must have one embedding manifest entry.',
		});
	}

	const embeddingSourceIds = allFinanceLores.map(({ loreId }) => loreId);
	return {
		mode: 'dry-run',
		dataVersion: DEMO_FIXTURE_DATA_VERSION,
		safety: {
			databaseConnectionAttempted: false,
			databaseWritesAttempted: false,
			embeddingProviderCallsAttempted: false,
			llmProviderCallsAttempted: false,
		},
		databaseInspection: {
			performed: false,
			existingRecordCounts: 'not_inspected',
			reason:
				'This local checkpoint intentionally does not connect to Neon. Existing rows and resumable embedding hashes require separately approved read-only inspection.',
		},
		plannedOperations: {
			characterUpserts: financeCharacter ? [financeCharacter.character.characterId] : [],
			loreUpserts: allFinanceLores.map(({ loreId }) => loreId),
			documentUpserts: [],
		},
		plannedEmbeddings: {
			replacementJobs: embeddingSourceIds.length,
			bySourceType: { lore: embeddingSourceIds.length, document: 0 },
			sourceIds: embeddingSourceIds,
			knownSkips: 0,
			databaseDependentSkips: 'not_inspected',
			maximumProviderCallsIfNoExistingHashesMatch: embeddingSourceIds.length,
		},
		localStableIdCollisions: duplicateIds,
		validationFailures,
	};
};

const isDirectExecution = process.argv[1]?.endsWith('financePreflight.ts');
if (isDirectExecution) {
	const report = buildFinanceFixturePreflightReport();
	process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
	if (report.validationFailures.length > 0) process.exitCode = 1;
}
