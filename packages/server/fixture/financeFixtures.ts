import { METADATA_TYPES } from '@rag-advisor-demo/shared/config';
import type { LoreInfo } from '@rag-advisor-demo/shared/domain';

import { deepFreeze, DEMO_FIXTURE_DATA_VERSION } from './fixtureUtils.js';

const FINANCE_CHARACTER_ID = 'finance-assistant_demo';
const FINANCE_FIXTURE_OWNER_ID = 'demo-fixture-user';
const FIXTURE_TIMESTAMP = '2026-07-24T00:00:00.000Z';

const POST_DEPOSIT_DATASET_SOURCE = {
	sourceId: 'KR-KPFD-POST-DEPOSIT-FEATURES-20251114',
	title: '우체국금융개발원_우체국예금 상품별 특징_20251114',
	authority: '우체국금융개발원',
	jurisdiction: 'KR',
	documentType: 'PRODUCT_DATASET',
	sourceUrl: 'https://www.data.go.kr/data/15090586/fileData.do',
	publishedAt: '2025-11-14',
	retrievedAt: '2026-07-27',
	license: 'PUBLIC_DATA_NO_RESTRICTION',
	dataAsOf: '2025-11-14',
} as const;

const POST_DEPOSIT_FICTIONALIZATION = {
	method: 'STRUCTURE_ONLY_FICTIONALIZATION' as const,
	source: POST_DEPOSIT_DATASET_SOURCE,
	changedFields: ['product name', 'issuer', 'rates', 'eligibility', 'conditions', 'term'],
	note:
		'Only the public dataset column structure informed this fixture. Every product identity, issuer, rate, eligibility rule, condition, and term is invented for the demo.',
};

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
			title: 'DEMO — 가온 생활예비 통장',
			generatedTitle: 'DEMO — 가온 생활예비 통장',
			summary: '공공 예금상품 데이터의 구조만 참고해 만든 가상의 저위험 수시입출식 예비자금 상품.',
			category: 'Concept',
			type: METADATA_TYPES.LORE,
			source: 'fictional-demo-fixture',
			content:
				'DEMO DATA ONLY. 가상 데모 상품입니다. 가온 생활예비 통장은 가상의 수시입출식 예금으로, 만기 제한 없이 자금을 입출금할 수 있도록 설계되었습니다. 예시 기본 연이율은 1.20%이고 가상의 조건을 충족하면 최대 0.80%포인트의 우대이율이 더해질 수 있습니다. 이율과 조건은 실제 상품 정보가 아니며 수익을 보장하지 않습니다. 이 fixture는 우체국 예금상품 공공데이터의 컬럼 구조만 참고했고 상품명, 발행기관, 이율, 가입 조건과 혜택은 모두 새로 만든 값입니다. 예금자보호 표시는 제도 설명을 위한 가상 적격 예시일 뿐 실제 보호 여부를 뜻하지 않습니다. 금융 자문이 아닙니다.',
			characterIds: [FINANCE_CHARACTER_ID],
			keywordList: ['생활예비 통장', '수시입출식', '높은 유동성', '단기 자금'],
			topicList: ['fictional financial product'],
			entityList: ['CEDAR-RESERVE'],
			domain: 'finance',
			fixtureId: 'cedar-reserve-account',
			isDemoData: true,
			dataVersion: DEMO_FIXTURE_DATA_VERSION,
			dataAsOf: '2026-07-27',
			structuredMetadata: {
				domain: 'finance',
				knowledgeType: 'product',
				productCode: 'CEDAR-RESERVE',
				productCategory: 'demand_deposit',
				depositProtection: 'fictional_example_eligible',
				riskLevel: 'low',
				minimumHorizonMonths: 0,
				liquidityLevel: 'high',
				fictionalization: POST_DEPOSIT_FICTIONALIZATION,
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
			title: 'DEMO — 누리 3년 정기예금',
			generatedTitle: 'DEMO — 누리 3년 정기예금',
			summary: '공공 예금상품 데이터의 구조만 참고해 만든 가상의 저위험 3년 만기 정기예금.',
			category: 'Concept',
			type: METADATA_TYPES.LORE,
			source: 'fictional-demo-fixture',
			content:
				'DEMO DATA ONLY. 가상 데모 상품입니다. 누리 3년 정기예금은 36개월 동안 유지하는 가상의 거치식 예금입니다. 예시 연이율은 3.10%이며 실제 판매 이율이 아닙니다. 중도해지 시 약정 이율보다 낮은 가상의 중도해지 이율이 적용되므로 만기 전 자금 접근성이 낮습니다. 이 fixture는 우체국 예금상품 공공데이터의 컬럼 구조만 참고했고 상품명, 발행기관, 이율, 가입 조건, 만기와 혜택은 모두 새로 만든 값입니다. 예금자보호 표시는 제도 설명을 위한 가상 적격 예시일 뿐 실제 보호 여부를 뜻하지 않습니다. 금융 자문이 아닙니다.',
			characterIds: [FINANCE_CHARACTER_ID],
			keywordList: ['정기예금', '거치식 예금', '3년 만기', '중간 유동성'],
			topicList: ['fictional financial product'],
			entityList: ['HARBOR-INCOME'],
			domain: 'finance',
			fixtureId: 'harbor-income-note',
			isDemoData: true,
			dataVersion: DEMO_FIXTURE_DATA_VERSION,
			dataAsOf: '2026-07-27',
			structuredMetadata: {
				domain: 'finance',
				knowledgeType: 'product',
				productCode: 'HARBOR-INCOME',
				productCategory: 'term_deposit',
				depositProtection: 'fictional_example_eligible',
				riskLevel: 'low',
				minimumHorizonMonths: 36,
				liquidityLevel: 'medium',
				fictionalization: POST_DEPOSIT_FICTIONALIZATION,
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
			title: 'DEMO — 마루 성장 포트폴리오',
			generatedTitle: 'DEMO — 마루 성장 포트폴리오',
			summary: 'Fictional high-risk growth portfolio with a five-year minimum horizon.',
			category: 'Concept',
			type: METADATA_TYPES.LORE,
			source: 'fictional-demo-fixture',
			content:
				'DEMO DATA ONLY. 가상 데모 상품입니다. 마루 성장 포트폴리오는 전적으로 가상인 분산 성장형 펀드입니다. 시장 상황에 따라 가치가 크게 변동하고 원금 손실이 발생할 수 있으며, 하락장에서 환매하면 손실이 확정될 수 있습니다. 예시 최소 투자 기간은 5년입니다. 예금이 아니며 예금자보호 대상이 아닙니다. 수익률과 결과는 보장되지 않으며 금융 자문이 아닙니다.',
			characterIds: [FINANCE_CHARACTER_ID],
			keywordList: ['growth', 'high risk', 'long horizon'],
			topicList: ['fictional financial product'],
			entityList: ['SUMMIT-GROWTH'],
			domain: 'finance',
			fixtureId: 'summit-growth-portfolio',
			isDemoData: true,
			dataVersion: DEMO_FIXTURE_DATA_VERSION,
			dataAsOf: '2026-07-27',
			structuredMetadata: {
				domain: 'finance',
				knowledgeType: 'product',
				productCode: 'SUMMIT-GROWTH',
				productCategory: 'fund',
				depositProtection: 'not_eligible',
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
			title: 'DEMO — 가온 생활예비 통장 유의사항',
			generatedTitle: 'DEMO — 가온 생활예비 통장 유의사항',
			summary: '가상의 이율, 우대 조건, 예금자보호 표시의 한계를 설명하는 유의사항.',
			category: 'Concept',
			type: METADATA_TYPES.LORE,
			source: 'fictional-demo-fixture',
			content:
				'DEMO DATA ONLY. 가상 데모 유의사항입니다. 가온 생활예비 통장의 1.20% 기본 이율과 최대 0.80%포인트 우대이율은 설명을 위한 가상 수치이며 실제 판매 조건이 아닙니다. 우대 조건 충족 여부에 따라 예시 이율이 달라질 수 있습니다. 예금자보호 관련 표시는 가상 상품을 이용한 제도 설명일 뿐 실제 금융회사나 실제 보호 대상 상품을 의미하지 않습니다. 최신 공식 제도와 실제 상품 약관을 별도로 확인해야 합니다.',
			characterIds: [FINANCE_CHARACTER_ID],
			keywordList: ['variable yield', 'no guarantee'],
			topicList: ['fictional product disclosure'],
			entityList: ['CEDAR-RESERVE'],
			domain: 'finance',
			fixtureId: 'cedar-reserve-account-disclosure',
			isDemoData: true,
			dataVersion: DEMO_FIXTURE_DATA_VERSION,
			dataAsOf: '2026-07-27',
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
			title: 'DEMO — 누리 3년 정기예금 유의사항',
			generatedTitle: 'DEMO — 누리 3년 정기예금 유의사항',
			summary: '가상의 약정 이율, 중도해지 불이익, 예금자보호 표시의 한계를 설명하는 유의사항.',
			category: 'Concept',
			type: METADATA_TYPES.LORE,
			source: 'fictional-demo-fixture',
			content:
				'DEMO DATA ONLY. 가상 데모 유의사항입니다. 누리 3년 정기예금의 3.10% 예시 연이율은 실제 판매 이율이 아니며, 36개월 전에 해지하면 더 낮은 가상의 중도해지 이율이 적용됩니다. 따라서 단기간에 자금이 필요할 수 있는 경우 적합하지 않을 수 있습니다. 예금자보호 관련 표시는 가상 상품을 이용한 제도 설명일 뿐 실제 금융회사나 실제 보호 대상 상품을 의미하지 않습니다. 최신 공식 제도와 실제 상품 약관을 별도로 확인해야 합니다.',
			characterIds: [FINANCE_CHARACTER_ID],
			keywordList: ['principal loss', 'limited liquidity'],
			topicList: ['fictional product disclosure'],
			entityList: ['HARBOR-INCOME'],
			domain: 'finance',
			fixtureId: 'harbor-income-note-disclosure',
			isDemoData: true,
			dataVersion: DEMO_FIXTURE_DATA_VERSION,
			dataAsOf: '2026-07-27',
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
			title: 'DEMO — 마루 성장 포트폴리오 유의사항',
			generatedTitle: 'DEMO — 마루 성장 포트폴리오 유의사항',
			summary: 'Fictional disclosure covering volatility, loss, and long-horizon risk.',
			category: 'Concept',
			type: METADATA_TYPES.LORE,
			source: 'fictional-demo-fixture',
			content:
				'DEMO DATA ONLY. 가상 데모 유의사항입니다. 마루 성장 포트폴리오는 큰 가격 변동과 원금 손실이 발생할 수 있습니다. 5년의 투자 기간도 손실을 방지하지 않으며 하락장에서 환매하면 손실이 확정될 수 있습니다. 예금이 아니므로 예금자보호 대상이 아닙니다. 과거 또는 예시 성과는 미래 수익을 보장하지 않습니다.',
			characterIds: [FINANCE_CHARACTER_ID],
			keywordList: ['volatility', 'loss', 'long horizon'],
			topicList: ['fictional product disclosure'],
			entityList: ['SUMMIT-GROWTH'],
			domain: 'finance',
			fixtureId: 'summit-growth-portfolio-disclosure',
			isDemoData: true,
			dataVersion: DEMO_FIXTURE_DATA_VERSION,
			dataAsOf: '2026-07-27',
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
