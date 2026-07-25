import {
	DEMO_CHARACTER_FIXTURES,
	DEMO_LORE_FIXTURES,
	validateBuiltInDomainFixtures,
} from './domainFixtures.js';
import { DEMO_FIXTURE_DATA_VERSION } from './fixtureUtils.js';
import { HEALTHCARE_OPERATIONS_FIXTURES } from './healthcareOperationsFixtures.js';

export interface HealthcareOperationsPreflightReport {
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

export const buildHealthcareOperationsPreflightReport = (): HealthcareOperationsPreflightReport => {
	const character = DEMO_CHARACTER_FIXTURES.find(
		({ character }) => character.domain === 'healthcare_operations'
	);
	const coreLores = DEMO_LORE_FIXTURES.filter(({ domain }) => domain === 'healthcare_operations');
	const workflowLores = HEALTHCARE_OPERATIONS_FIXTURES.map(({ lore }) => lore);
	const allLores = [...coreLores, ...workflowLores];
	const domainValidation = validateBuiltInDomainFixtures();
	const duplicateIds = [
		...new Set(
			domainValidation.issues
				.filter(
					({ code }) =>
						code === 'DUPLICATE_FIXTURE_ID' ||
						code === 'DUPLICATE_CHARACTER_ID' ||
						code === 'DUPLICATE_LORE_ID'
				)
				.map(({ fixtureId }) => fixtureId)
		),
	];
	const validationFailures: HealthcareOperationsPreflightReport['validationFailures'] = [
		...domainValidation.issues,
	];
	if (!character) {
		validationFailures.push({
			code: 'MISSING_HEALTHCARE_OPERATIONS_CHARACTER',
			fixtureId: 'healthcare-operations-assistant',
			message: 'The deterministic Healthcare Operations Character fixture is missing.',
		});
	}

	const embeddingSourceIds = allLores.map(({ loreId }) => loreId);
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
			characterUpserts: character ? [character.character.characterId] : [],
			loreUpserts: embeddingSourceIds,
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

const isDirectExecution = process.argv[1]?.endsWith('healthcareOperationsPreflight.ts');
if (isDirectExecution) {
	const report = buildHealthcareOperationsPreflightReport();
	process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
	if (report.validationFailures.length > 0) process.exitCode = 1;
}
