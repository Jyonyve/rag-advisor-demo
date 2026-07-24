import assert from 'node:assert/strict';
import test from 'node:test';

import type { FinanceCatalogFixture, FinanceEmbeddingFixtureMetadata } from './financeFixtures.js';
import { FINANCE_CATALOG_FIXTURES, FINANCE_EMBEDDING_FIXTURE_METADATA } from './financeFixtures.js';
import { hydrateFinanceCatalogFixtures } from './financeFixtureHydration.js';
import { buildFinanceFixturePreflightReport } from './financePreflight.js';

const cloneFixtures = (): FinanceCatalogFixture[] =>
	structuredClone(FINANCE_CATALOG_FIXTURES) as unknown as FinanceCatalogFixture[];

const cloneEmbeddingMetadata = (): FinanceEmbeddingFixtureMetadata[] =>
	structuredClone(FINANCE_EMBEDDING_FIXTURE_METADATA) as FinanceEmbeddingFixtureMetadata[];

const issueCodes = (input: Parameters<typeof hydrateFinanceCatalogFixtures>[0] = {}): string[] =>
	hydrateFinanceCatalogFixtures(input).issues.map(({ code }) => code);

test('hydrates every finance product and disclosure fixture from canonical Lore bodies', () => {
	const report = hydrateFinanceCatalogFixtures();
	assert.equal(report.ok, true);
	assert.equal(report.issues.length, 0);
	assert.equal(report.hydrated.length, FINANCE_CATALOG_FIXTURES.length);
	assert.equal(Object.isFrozen(FINANCE_CATALOG_FIXTURES), true);
	assert.equal(Object.isFrozen(FINANCE_CATALOG_FIXTURES[0].lore), true);
	assert.equal(Object.isFrozen(FINANCE_EMBEDDING_FIXTURE_METADATA), true);
});

test('rejects unknown and duplicate fixture IDs', () => {
	const duplicateFixtures = cloneFixtures();
	duplicateFixtures.push(structuredClone(duplicateFixtures[0]));
	assert.ok(issueCodes({ fixtures: duplicateFixtures }).includes('DUPLICATE_FIXTURE_ID'));

	const unknownFixtureMetadata = cloneEmbeddingMetadata();
	unknownFixtureMetadata[0].loreFixtureId = 'unknown-finance-fixture';
	assert.ok(
		issueCodes({ embeddingMetadata: unknownFixtureMetadata }).includes('UNKNOWN_FIXTURE_ID')
	);

	const duplicateEmbeddingMetadata = cloneEmbeddingMetadata();
	duplicateEmbeddingMetadata[1].embeddingFixtureId =
		duplicateEmbeddingMetadata[0].embeddingFixtureId;
	assert.ok(
		issueCodes({ embeddingMetadata: duplicateEmbeddingMetadata }).includes(
			'DUPLICATE_EMBEDDING_FIXTURE_ID'
		)
	);
});

test('rejects catalog and embedding data-version mismatches', () => {
	const fixtures = cloneFixtures();
	fixtures[0].dataVersion = 'stale-version';
	assert.ok(issueCodes({ fixtures }).includes('DATA_VERSION_MISMATCH'));

	const embeddingMetadata = cloneEmbeddingMetadata();
	embeddingMetadata[0].dataVersion = 'stale-version';
	assert.ok(issueCodes({ embeddingMetadata }).includes('DATA_VERSION_MISMATCH'));
});

test('rejects missing canonical fixture bodies', () => {
	const fixtures = cloneFixtures();
	fixtures[0].lore.content = '   ';
	assert.ok(issueCodes({ fixtures }).includes('MISSING_CANONICAL_FIXTURE_BODY'));
});

test('rejects embedding metadata pointing to nonexistent products or disclosures', () => {
	for (const entityKind of ['product', 'disclosure'] as const) {
		const embeddingMetadata = cloneEmbeddingMetadata();
		embeddingMetadata[0] = {
			...embeddingMetadata[0],
			entityKind,
			entityFixtureId: `missing-${entityKind}`,
		};
		assert.ok(
			issueCodes({ embeddingMetadata }).includes('NONEXISTENT_EMBEDDING_ENTITY'),
			`expected missing ${entityKind} to be rejected`
		);
	}
});

test('rejects disclosures whose canonical product fixture is missing', () => {
	const fixtures = cloneFixtures();
	const disclosure = fixtures.find(({ kind }) => kind === 'disclosure');
	assert.ok(disclosure);
	disclosure.productFixtureId = 'missing-product';
	assert.ok(issueCodes({ fixtures }).includes('NONEXISTENT_DISCLOSURE_PRODUCT'));
});

test('finance preflight is deterministic and explicitly performs no external operations', () => {
	const report = buildFinanceFixturePreflightReport();
	assert.equal(report.mode, 'dry-run');
	assert.deepEqual(report.safety, {
		databaseConnectionAttempted: false,
		databaseWritesAttempted: false,
		embeddingProviderCallsAttempted: false,
		llmProviderCallsAttempted: false,
	});
	assert.equal(report.databaseInspection.existingRecordCounts, 'not_inspected');
	assert.deepEqual(report.plannedOperations.characterUpserts, ['finance-assistant_demo']);
	assert.equal(report.plannedOperations.loreUpserts.length, 7);
	assert.deepEqual(report.plannedOperations.documentUpserts, []);
	assert.equal(report.plannedEmbeddings.replacementJobs, 7);
	assert.deepEqual(report.plannedEmbeddings.bySourceType, { lore: 7, document: 0 });
	assert.equal(report.localStableIdCollisions.length, 0);
	assert.equal(report.validationFailures.length, 0);
});
