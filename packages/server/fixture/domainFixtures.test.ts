import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError, LoreInfo, assistantDomainSchema } from '@rag-advisor-demo/shared/domain';
import { buildSessionId, parseSessionId } from '@rag-advisor-demo/shared/util';
import { validateServiceId } from '../util/routeHelpers.js';
import {
	parseDomainProfileForCharacter,
	parseOfficialLoreMetadata,
	parseOfficialLoreMetadataForCharacters,
	parseRequiredAssistantDomain,
} from '../util/domainValidationUtils.js';
import {
	DEMO_CHARACTER_FIXTURES,
	DEMO_FIXTURE_DATA_VERSION,
	DEMO_LORE_FIXTURES,
	DemoCharacterFixture,
	FixtureValidationIssueCode,
	validateBuiltInDomainFixtures,
	validateDomainFixtures,
} from './domainFixtures.js';
import { HEALTHCARE_OPERATIONS_FIXTURES } from './healthcareOperationsFixtures.js';

const cloneCharacters = (): DemoCharacterFixture[] =>
	structuredClone(DEMO_CHARACTER_FIXTURES) as unknown as DemoCharacterFixture[];
const cloneLore = (): LoreInfo[] => structuredClone(DEMO_LORE_FIXTURES) as unknown as LoreInfo[];

const issueCodes = (input: {
	characters?: readonly DemoCharacterFixture[];
	lores?: readonly LoreInfo[];
}): FixtureValidationIssueCode[] =>
	validateDomainFixtures({
		characters: input.characters ?? cloneCharacters(),
		lores: input.lores ?? cloneLore(),
	}).issues.map((issue) => issue.code);

test('built-in domain fixtures are deterministic and valid without providers or database access', () => {
	const expectedIds = ['finance-assistant_demo', 'healthcare-operations-assistant_demo'];
	assert.deepEqual(
		DEMO_CHARACTER_FIXTURES.map(({ character }) => character.characterId),
		expectedIds
	);
	assert.equal(Object.isFrozen(DEMO_CHARACTER_FIXTURES), true);
	assert.equal(Object.isFrozen(DEMO_CHARACTER_FIXTURES[0].character), true);
	assert.equal(Object.isFrozen(DEMO_LORE_FIXTURES), true);
	assert.equal(Object.isFrozen(DEMO_LORE_FIXTURES[0].characterIds), true);
	assert.equal(Object.isFrozen(HEALTHCARE_OPERATIONS_FIXTURES), true);
	assert.equal(Object.isFrozen(HEALTHCARE_OPERATIONS_FIXTURES[0].lore.structuredMetadata), true);

	const report = validateBuiltInDomainFixtures();
	assert.deepEqual(report, {
		valid: true,
		characterCount: 2,
		loreCount: 13,
		expectedEmbeddingCalls: 13,
		issues: [],
	});
});

test('fixed Character IDs pass current validation and preserve identity through Session parsing', () => {
	for (const { character } of DEMO_CHARACTER_FIXTURES) {
		assert.doesNotThrow(() => validateServiceId(character.characterId, 'character'));
		assert.equal(assistantDomainSchema.parse(character.domain), character.domain);

		const sessionId = buildSessionId(character.characterId);
		assert.equal(parseSessionId(sessionId).characterId, character.characterId);
		assert.equal(character.variant, 'demo');
	}
});

test('fixture validation rejects duplicate, unparseable, and unsupported Characters', () => {
	const duplicate = cloneCharacters();
	duplicate[1].character.characterId = duplicate[0].character.characterId;
	assert.ok(issueCodes({ characters: duplicate }).includes('DUPLICATE_CHARACTER_ID'));

	const invalidId = cloneCharacters();
	invalidId[1].character.characterId = 'healthcare_operations_demo';
	assert.ok(issueCodes({ characters: invalidId }).includes('INVALID_CHARACTER_ID'));

	const unsupported = cloneCharacters();
	(unsupported[0].character as { domain: string }).domain = 'unsupported';
	assert.ok(issueCodes({ characters: unsupported }).includes('UNSUPPORTED_DOMAIN'));
});

test('Profile runtime validation accepts matching domains and rejects mismatch or invalid data', () => {
	assert.deepEqual(
		parseDomainProfileForCharacter(
			{ domain: 'finance', investmentHorizonMonths: 36, constraints: ['fictional demo constraint'] },
			'finance'
		),
		{ domain: 'finance', investmentHorizonMonths: 36, constraints: ['fictional demo constraint'] }
	);
	assert.deepEqual(
		parseDomainProfileForCharacter({ domain: 'healthcare_operations' }, 'healthcare_operations'),
		{ domain: 'healthcare_operations', constraints: [] }
	);

	assert.throws(
		() =>
			parseDomainProfileForCharacter({ domain: 'healthcare_operations', constraints: [] }, 'finance'),
		(error: unknown) => error instanceof ApiError && error.status === 400
	);
	assert.throws(
		() =>
			parseDomainProfileForCharacter({ domain: 'finance', constraints: [] }, 'healthcare_operations'),
		(error: unknown) => error instanceof ApiError && error.status === 400
	);
	assert.throws(
		() => parseDomainProfileForCharacter({ domain: 'unsupported' }, 'finance'),
		(error: unknown) => error instanceof ApiError && error.status === 400
	);
	assert.throws(
		() => parseDomainProfileForCharacter(null, 'finance'),
		(error: unknown) => error instanceof ApiError && error.status === 400
	);
	assert.throws(
		() => parseDomainProfileForCharacter(undefined, 'finance'),
		(error: unknown) => error instanceof ApiError && error.status === 400
	);
	assert.throws(
		() =>
			parseDomainProfileForCharacter({ domain: 'finance', investmentHorizonMonths: -1 }, 'finance'),
		(error: unknown) => error instanceof ApiError && error.status === 400
	);
	assert.throws(
		() => parseDomainProfileForCharacter({ domain: 'finance', constraints: [] }, undefined),
		(error: unknown) => error instanceof ApiError && error.status === 400
	);
});

test('Character persistence domain validation requires a supported runtime value', () => {
	assert.equal(parseRequiredAssistantDomain('finance'), 'finance');
	assert.equal(parseRequiredAssistantDomain('healthcare_operations'), 'healthcare_operations');
	assert.throws(
		() => parseRequiredAssistantDomain(undefined),
		(error: unknown) => error instanceof ApiError && error.status === 400
	);
	assert.throws(
		() => parseRequiredAssistantDomain('unsupported'),
		(error: unknown) => error instanceof ApiError && error.status === 400
	);
});

test('official Lore metadata is strict and matches server-loaded Character domains', () => {
	const financeLore = cloneLore()[0];
	const financeCharacter = cloneCharacters()[0].character;
	const healthcareCharacter = cloneCharacters()[1].character;

	assert.equal(
		parseOfficialLoreMetadataForCharacters(financeLore, [financeCharacter]).domain,
		'finance'
	);
	assert.throws(
		() => parseOfficialLoreMetadataForCharacters(financeLore, [healthcareCharacter]),
		(error: unknown) => error instanceof ApiError && error.status === 400
	);
	assert.throws(
		() => parseOfficialLoreMetadata({ ...financeLore, structuredMetadata: { domain: 'finance' } }),
		(error: unknown) => error instanceof ApiError && error.status === 400
	);
	assert.throws(
		() => parseOfficialLoreMetadataForCharacters(financeLore, []),
		(error: unknown) => error instanceof ApiError && error.status === 400
	);
});

test('Lore validation rejects unknown Characters and cross-domain associations', () => {
	const duplicateLoreId = cloneLore();
	duplicateLoreId[1].loreId = duplicateLoreId[0].loreId;
	assert.ok(issueCodes({ lores: duplicateLoreId }).includes('DUPLICATE_LORE_ID'));

	const duplicateFixtureId = cloneLore();
	duplicateFixtureId[1].fixtureId = duplicateFixtureId[0].fixtureId;
	assert.ok(issueCodes({ lores: duplicateFixtureId }).includes('DUPLICATE_FIXTURE_ID'));

	const unknownCharacter = cloneLore();
	unknownCharacter[0].characterIds = ['missing-character_demo'];
	assert.ok(issueCodes({ lores: unknownCharacter }).includes('UNKNOWN_CHARACTER_REFERENCE'));

	const mismatch = cloneLore();
	mismatch[0].domain = 'healthcare_operations';
	assert.ok(issueCodes({ lores: mismatch }).includes('LORE_CHARACTER_DOMAIN_MISMATCH'));
});

test('Lore validation rejects missing canonical content, fixture metadata, and demo markers', () => {
	const missingContent = cloneLore();
	missingContent[0].content = ' ';
	assert.ok(issueCodes({ lores: missingContent }).includes('MISSING_CANONICAL_LORE_CONTENT'));

	const missingFixtureId = cloneLore();
	missingFixtureId[0].fixtureId = '';
	assert.ok(issueCodes({ lores: missingFixtureId }).includes('MISSING_FIXTURE_ID'));

	const missingDemoMarker = cloneLore();
	missingDemoMarker[0].isDemoData = false;
	assert.ok(issueCodes({ lores: missingDemoMarker }).includes('MISSING_DEMO_MARKER'));

	const missingVersion = cloneLore();
	missingVersion[0].dataVersion = '';
	assert.ok(issueCodes({ lores: missingVersion }).includes('MISSING_DATA_VERSION'));

	const inconsistentVersion = cloneLore();
	inconsistentVersion[0].dataVersion = `${DEMO_FIXTURE_DATA_VERSION}-stale`;
	assert.ok(issueCodes({ lores: inconsistentVersion }).includes('INCONSISTENT_DATA_VERSION'));
});

test('Lore validation rejects invalid structured metadata and prohibited data shapes', () => {
	const invalidStructuredMetadata = cloneLore();
	invalidStructuredMetadata[0].structuredMetadata = {
		domain: 'finance',
		knowledgeType: 'education',
		riskLevel: 'unsupported',
	} as never;
	assert.ok(
		issueCodes({ lores: invalidStructuredMetadata }).includes('INVALID_STRUCTURED_METADATA')
	);

	const prohibited = cloneLore();
	prohibited[0].summary = 'Actual patient details';
	assert.ok(issueCodes({ lores: prohibited }).includes('PROHIBITED_FIXTURE_CONTENT'));
});
