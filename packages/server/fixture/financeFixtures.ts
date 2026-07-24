import { METADATA_TYPES } from '@rag-advisor-demo/shared/config';
import type { LoreInfo } from '@rag-advisor-demo/shared/domain';

import { deepFreeze, DEMO_FIXTURE_DATA_VERSION } from './fixtureUtils.js';

const FINANCE_CHARACTER_ID = 'finance-assistant_demo';
const FINANCE_FIXTURE_OWNER_ID = 'demo-fixture-user';
const FIXTURE_TIMESTAMP = '2026-07-24T00:00:00.000Z';

export type FinanceCatalogFixtureKind = 'product' | 'disclosure';

export interface FinanceCatalogFixture {
	fixtureId: string;
	kind: FinanceCatalogFixtureKind;
	productFixtureId?: string;
	dataVersion: string;
	lore: LoreInfo;
}

export interface FinanceEmbeddingFixtureMetadata {
	embeddingFixtureId: string;
	loreFixtureId: string;
	entityKind: FinanceCatalogFixtureKind;
	entityFixtureId: string;
	dataVersion: string;
}

export const FINANCE_CATALOG_FIXTURES = deepFreeze([
	{
		fixtureId: 'cedar-reserve-account',
		kind: 'product',
		dataVersion: DEMO_FIXTURE_DATA_VERSION,
		lore: {
			loreId: 'cedar-reserve-account_demo-lore',
			userId: FINANCE_FIXTURE_OWNER_ID,
			createdAt: FIXTURE_TIMESTAMP,
			updatedAt: FIXTURE_TIMESTAMP,
			title: 'DEMO — Cedar Reserve Account',
			generatedTitle: 'DEMO — Cedar Reserve Account',
			summary: 'Fictional low-risk cash reserve product with high liquidity.',
			category: 'Concept',
			type: METADATA_TYPES.LORE,
			source: 'fictional-demo-fixture',
			content:
				'DEMO DATA ONLY. Cedar Reserve Account is a fictional cash product. It permits withdrawals without a lock-up, has no guaranteed return, and may pay a variable illustrative yield. It is intended for short horizons and high liquidity needs. This is educational demo content, not financial advice.',
			characterIds: [FINANCE_CHARACTER_ID],
			keywordList: ['cash reserve', 'high liquidity', 'short horizon'],
			topicList: ['fictional financial product'],
			entityList: ['CEDAR-RESERVE'],
			domain: 'finance',
			fixtureId: 'cedar-reserve-account',
			isDemoData: true,
			dataVersion: DEMO_FIXTURE_DATA_VERSION,
			dataAsOf: '2026-07-24',
			structuredMetadata: {
				domain: 'finance',
				knowledgeType: 'product',
				productCode: 'CEDAR-RESERVE',
				riskLevel: 'low',
				minimumHorizonMonths: 0,
				liquidityLevel: 'high',
			},
		},
	},
	{
		fixtureId: 'harbor-income-note',
		kind: 'product',
		dataVersion: DEMO_FIXTURE_DATA_VERSION,
		lore: {
			loreId: 'harbor-income-note_demo-lore',
			userId: FINANCE_FIXTURE_OWNER_ID,
			createdAt: FIXTURE_TIMESTAMP,
			updatedAt: FIXTURE_TIMESTAMP,
			title: 'DEMO — Harbor Income Note',
			generatedTitle: 'DEMO — Harbor Income Note',
			summary: 'Fictional medium-risk income product with a three-year illustrative horizon.',
			category: 'Concept',
			type: METADATA_TYPES.LORE,
			source: 'fictional-demo-fixture',
			content:
				'DEMO DATA ONLY. Harbor Income Note is a fictional three-year income product. Principal and income are not guaranteed, early exit may be limited, and market conditions may reduce value. It is intended only for deterministic RAG demonstrations, not financial advice.',
			characterIds: [FINANCE_CHARACTER_ID],
			keywordList: ['income', 'medium risk', 'three year horizon'],
			topicList: ['fictional financial product'],
			entityList: ['HARBOR-INCOME'],
			domain: 'finance',
			fixtureId: 'harbor-income-note',
			isDemoData: true,
			dataVersion: DEMO_FIXTURE_DATA_VERSION,
			dataAsOf: '2026-07-24',
			structuredMetadata: {
				domain: 'finance',
				knowledgeType: 'product',
				productCode: 'HARBOR-INCOME',
				riskLevel: 'medium',
				minimumHorizonMonths: 36,
				liquidityLevel: 'medium',
			},
		},
	},
	{
		fixtureId: 'summit-growth-portfolio',
		kind: 'product',
		dataVersion: DEMO_FIXTURE_DATA_VERSION,
		lore: {
			loreId: 'summit-growth-portfolio_demo-lore',
			userId: FINANCE_FIXTURE_OWNER_ID,
			createdAt: FIXTURE_TIMESTAMP,
			updatedAt: FIXTURE_TIMESTAMP,
			title: 'DEMO — Summit Growth Portfolio',
			generatedTitle: 'DEMO — Summit Growth Portfolio',
			summary: 'Fictional high-risk growth portfolio with a five-year minimum horizon.',
			category: 'Concept',
			type: METADATA_TYPES.LORE,
			source: 'fictional-demo-fixture',
			content:
				'DEMO DATA ONLY. Summit Growth Portfolio is a fictional diversified growth product. Its value can fluctuate substantially, losses are possible, and withdrawals may be poorly timed during market declines. The illustrative minimum horizon is five years. This is not financial advice.',
			characterIds: [FINANCE_CHARACTER_ID],
			keywordList: ['growth', 'high risk', 'long horizon'],
			topicList: ['fictional financial product'],
			entityList: ['SUMMIT-GROWTH'],
			domain: 'finance',
			fixtureId: 'summit-growth-portfolio',
			isDemoData: true,
			dataVersion: DEMO_FIXTURE_DATA_VERSION,
			dataAsOf: '2026-07-24',
			structuredMetadata: {
				domain: 'finance',
				knowledgeType: 'product',
				productCode: 'SUMMIT-GROWTH',
				riskLevel: 'high',
				minimumHorizonMonths: 60,
				liquidityLevel: 'low',
			},
		},
	},
	{
		fixtureId: 'cedar-reserve-account-disclosure',
		kind: 'disclosure',
		productFixtureId: 'cedar-reserve-account',
		dataVersion: DEMO_FIXTURE_DATA_VERSION,
		lore: {
			loreId: 'cedar-reserve-account-disclosure_demo-lore',
			userId: FINANCE_FIXTURE_OWNER_ID,
			createdAt: FIXTURE_TIMESTAMP,
			updatedAt: FIXTURE_TIMESTAMP,
			title: 'DEMO — Cedar Reserve Account Disclosure',
			generatedTitle: 'DEMO — Cedar Reserve Account Disclosure',
			summary: 'Fictional disclosure stating that yield and access terms may change.',
			category: 'Concept',
			type: METADATA_TYPES.LORE,
			source: 'fictional-demo-fixture',
			content:
				'DEMO DATA ONLY. The Cedar Reserve Account has no guaranteed yield. Illustrative rates and withdrawal conditions may change. The fictional issuer provides no deposit insurance or capital guarantee in this demonstration.',
			characterIds: [FINANCE_CHARACTER_ID],
			keywordList: ['variable yield', 'no guarantee'],
			topicList: ['fictional product disclosure'],
			entityList: ['CEDAR-RESERVE'],
			domain: 'finance',
			fixtureId: 'cedar-reserve-account-disclosure',
			isDemoData: true,
			dataVersion: DEMO_FIXTURE_DATA_VERSION,
			dataAsOf: '2026-07-24',
			structuredMetadata: {
				domain: 'finance',
				knowledgeType: 'disclosure',
				productFixtureId: 'cedar-reserve-account',
				disclosureCode: 'CEDAR-RESERVE-DISCLOSURE',
			},
		},
	},
	{
		fixtureId: 'harbor-income-note-disclosure',
		kind: 'disclosure',
		productFixtureId: 'harbor-income-note',
		dataVersion: DEMO_FIXTURE_DATA_VERSION,
		lore: {
			loreId: 'harbor-income-note-disclosure_demo-lore',
			userId: FINANCE_FIXTURE_OWNER_ID,
			createdAt: FIXTURE_TIMESTAMP,
			updatedAt: FIXTURE_TIMESTAMP,
			title: 'DEMO — Harbor Income Note Disclosure',
			generatedTitle: 'DEMO — Harbor Income Note Disclosure',
			summary: 'Fictional disclosure covering principal loss and limited early liquidity.',
			category: 'Concept',
			type: METADATA_TYPES.LORE,
			source: 'fictional-demo-fixture',
			content:
				'DEMO DATA ONLY. Harbor Income Note can lose principal, distributions may be reduced or omitted, and an early sale may be unavailable or occur below the illustrative purchase value. No outcome is guaranteed.',
			characterIds: [FINANCE_CHARACTER_ID],
			keywordList: ['principal loss', 'limited liquidity'],
			topicList: ['fictional product disclosure'],
			entityList: ['HARBOR-INCOME'],
			domain: 'finance',
			fixtureId: 'harbor-income-note-disclosure',
			isDemoData: true,
			dataVersion: DEMO_FIXTURE_DATA_VERSION,
			dataAsOf: '2026-07-24',
			structuredMetadata: {
				domain: 'finance',
				knowledgeType: 'disclosure',
				productFixtureId: 'harbor-income-note',
				disclosureCode: 'HARBOR-INCOME-DISCLOSURE',
			},
		},
	},
	{
		fixtureId: 'summit-growth-portfolio-disclosure',
		kind: 'disclosure',
		productFixtureId: 'summit-growth-portfolio',
		dataVersion: DEMO_FIXTURE_DATA_VERSION,
		lore: {
			loreId: 'summit-growth-portfolio-disclosure_demo-lore',
			userId: FINANCE_FIXTURE_OWNER_ID,
			createdAt: FIXTURE_TIMESTAMP,
			updatedAt: FIXTURE_TIMESTAMP,
			title: 'DEMO — Summit Growth Portfolio Disclosure',
			generatedTitle: 'DEMO — Summit Growth Portfolio Disclosure',
			summary: 'Fictional disclosure covering volatility, loss, and long-horizon risk.',
			category: 'Concept',
			type: METADATA_TYPES.LORE,
			source: 'fictional-demo-fixture',
			content:
				'DEMO DATA ONLY. Summit Growth Portfolio may experience substantial volatility and loss. A five-year horizon does not prevent loss, and liquidation during a downturn may crystallize losses. Past or illustrative performance is not a guarantee.',
			characterIds: [FINANCE_CHARACTER_ID],
			keywordList: ['volatility', 'loss', 'long horizon'],
			topicList: ['fictional product disclosure'],
			entityList: ['SUMMIT-GROWTH'],
			domain: 'finance',
			fixtureId: 'summit-growth-portfolio-disclosure',
			isDemoData: true,
			dataVersion: DEMO_FIXTURE_DATA_VERSION,
			dataAsOf: '2026-07-24',
			structuredMetadata: {
				domain: 'finance',
				knowledgeType: 'disclosure',
				productFixtureId: 'summit-growth-portfolio',
				disclosureCode: 'SUMMIT-GROWTH-DISCLOSURE',
			},
		},
	},
] as const satisfies readonly FinanceCatalogFixture[]);

export const FINANCE_EMBEDDING_FIXTURE_METADATA = deepFreeze(
	FINANCE_CATALOG_FIXTURES.map((fixture) => ({
		embeddingFixtureId: `${fixture.fixtureId}-embedding`,
		loreFixtureId: fixture.fixtureId,
		entityKind: fixture.kind,
		entityFixtureId: fixture.fixtureId,
		dataVersion: fixture.dataVersion,
	})) satisfies readonly FinanceEmbeddingFixtureMetadata[]
);
