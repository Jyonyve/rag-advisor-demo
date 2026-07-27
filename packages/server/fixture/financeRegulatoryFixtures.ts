import { METADATA_TYPES } from '@rag-advisor-demo/shared/config';
import type { LoreInfo, PublicSourceAttribution } from '@rag-advisor-demo/shared/domain';

import { deepFreeze, DEMO_FIXTURE_DATA_VERSION } from './fixtureUtils.js';

const FINANCE_CHARACTER_ID = 'finance-assistant_demo';
const FIXTURE_OWNER_ID = 'demo-fixture-user';
const FIXTURE_TIMESTAMP = '2026-07-27T00:00:00.000Z';
const RETRIEVED_AT = '2026-07-27';

type RegulatoryFixtureInput = {
	fixtureId: string;
	title: string;
	summary: string;
	content: string;
	keywords: string[];
	topics: string[];
	dataAsOf: string;
	publicSource: PublicSourceAttribution;
};

const createRegulatoryLore = ({
	fixtureId,
	title,
	summary,
	content,
	keywords,
	topics,
	dataAsOf,
	publicSource,
}: RegulatoryFixtureInput): LoreInfo => ({
	loreId: `${fixtureId}_demo-lore`,
	userId: FIXTURE_OWNER_ID,
	createdAt: FIXTURE_TIMESTAMP,
	updatedAt: FIXTURE_TIMESTAMP,
	title,
	generatedTitle: title,
	summary,
	category: 'Politics',
	type: METADATA_TYPES.LORE,
	source: 'official-korean-public-source',
	content,
	characterIds: [FINANCE_CHARACTER_ID],
	keywordList: keywords,
	topicList: topics,
	entityList: [publicSource.authority],
	domain: 'finance',
	fixtureId,
	isDemoData: true,
	dataVersion: DEMO_FIXTURE_DATA_VERSION,
	dataAsOf,
	structuredMetadata: { domain: 'finance', knowledgeType: 'education', publicSource },
});

export const FINANCE_REGULATORY_FIXTURES = deepFreeze([
	createRegulatoryLore({
		fixtureId: 'kr-financial-consumer-protection-act-20260102',
		title: '금융소비자 보호에 관한 법률 — 핵심 원칙',
		summary: '적합성·적정성·설명의무와 금융소비자의 주요 권리를 정리한 공공 규제 근거.',
		content:
			'실제 대한민국 법령의 교육용 요약입니다. 금융소비자보호법 제17조는 권유 과정에서 소비자의 목적, 재산상황, 투자 경험 등 필요한 정보를 파악하고 부적합한 상품을 권유하지 않는 적합성 원칙을 둡니다. 제18조는 권유 없이 소비자가 계약하려는 경우에도 상품이 소비자에게 적정한지 판단하고 부적정 사실을 알리는 적정성 원칙을 규정합니다. 제19조는 중요한 상품 내용과 위험을 이해할 수 있도록 설명해야 한다는 설명의무를 둡니다. 제20조와 제21조는 불공정영업행위와 부당권유행위를 금지합니다. 제46조는 법이 정한 금융상품의 청약철회권, 제47조는 법 위반 계약의 해지 요구권을 규정합니다. 구체적인 적용 대상과 절차는 최신 법령 및 시행령 원문을 다시 확인해야 합니다. 이 데모의 상품과 사용자 프로필은 모두 가상이며 이 요약은 법률 또는 금융 자문이 아닙니다.',
		keywords: ['금융소비자보호법', '적합성 원칙', '적정성 원칙', '설명의무', '청약철회권'],
		topics: ['대한민국 금융 규제', '금융소비자 보호'],
		dataAsOf: '2026-01-02',
		publicSource: {
			sourceId: 'KR-FCPA-20260102',
			title: '금융소비자 보호에 관한 법률',
			authority: '국가법령정보센터',
			jurisdiction: 'KR',
			documentType: 'LEGISLATION',
			sourceUrl: 'https://www.law.go.kr/LSW/lsInfoP.do?lsId=013704',
			publishedAt: '2025-10-01',
			retrievedAt: RETRIEVED_AT,
			license: 'KOREAN_LAW_TEXT',
			dataAsOf: '2026-01-02',
		},
	}),
	createRegulatoryLore({
		fixtureId: 'kr-financial-consumer-protection-decree-20260428',
		title: '금융소비자 보호에 관한 법률 시행령 — 세부 기준',
		summary: '금융소비자보호법상 의무와 적용 대상을 구체화하는 시행령 근거.',
		content:
			'실제 대한민국 시행령의 교육용 요약입니다. 금융소비자보호법 시행령은 적합성·적정성 판단에 필요한 금융상품 범위와 소비자 정보, 설명해야 할 중요 사항, 광고와 금융소비자 보호 관련 세부 기준을 구체화합니다. 상품명, 이자율, 수수료, 원금손실 가능성, 소비자의 설명받을 권리와 예금자보호 관련 내용 등은 상품 유형에 따라 중요한 설명 요소가 될 수 있습니다. 실제 적용 여부는 상품 유형과 최신 시행령 원문에 따라 확인해야 합니다. 이 데모의 상품과 사용자 프로필은 모두 가상이며 이 요약은 법률 또는 금융 자문이 아닙니다.',
		keywords: ['금융소비자보호법 시행령', '세부 기준', '원금손실', '설명 항목'],
		topics: ['대한민국 금융 규제', '규제 세부 기준'],
		dataAsOf: '2026-04-28',
		publicSource: {
			sourceId: 'KR-FCPA-DECREE-20260428',
			title: '금융소비자 보호에 관한 법률 시행령',
			authority: '국가법령정보센터',
			jurisdiction: 'KR',
			documentType: 'REGULATION_DETAIL',
			sourceUrl: 'https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=285715',
			publishedAt: '2026-04-28',
			retrievedAt: RETRIEVED_AT,
			license: 'KOREAN_LAW_TEXT',
			dataAsOf: '2026-04-28',
		},
	}),
	createRegulatoryLore({
		fixtureId: 'kr-fsc-suitability-guidance-20210317',
		title: '금융위원회 설명 — 적합성 원칙과 소비자 선택권',
		summary:
			'적합성 원칙이 부적합 상품의 권유를 제한하지만 소비자의 자발적 청약을 일률적으로 금지하지 않는다는 설명.',
		content:
			'금융위원회의 2021년 3월 17일 공개 설명자료를 출처 표시 조건에 따라 요약했습니다. 적합성 원칙은 금융상품이 소비자의 투자성향 등에 부적합한 경우 해당 상품의 권유를 제한하는 규정입니다. 소비자가 권유받지 않고 자발적으로 청약하는 경우까지 일률적으로 판매를 금지하는 취지는 아닙니다. 여러 자산으로 구성된 펀드의 위험은 개별 자산 하나가 아니라 펀드 전체의 위험을 종합해 평가하며, 설명의무는 상품의 중요 사항과 위험을 소비자가 이해할 수 있도록 제공하는 데 목적이 있습니다. 이 데모의 상품과 사용자 프로필은 모두 가상이며 이 자료는 금융 자문이 아닙니다. 출처: 금융위원회·대한민국 정책브리핑.',
		keywords: ['적합성 원칙', '소비자 선택권', '부적합 상품', '권유', '펀드 위험'],
		topics: ['금융위원회 규제 해설', '금융소비자 보호'],
		dataAsOf: '2021-03-17',
		publicSource: {
			sourceId: 'KR-FSC-SUITABILITY-20210317',
			title: '금융소비자보호법, 소비자 선택권 방해 안해',
			authority: '금융위원회',
			jurisdiction: 'KR',
			documentType: 'REGULATORY_GUIDANCE',
			sourceUrl: 'https://www.korea.kr/briefing/actuallyView.do?newsId=148885132',
			publishedAt: '2021-03-17',
			retrievedAt: RETRIEVED_AT,
			license: 'KOGL_TYPE_1_TEXT_ONLY',
			dataAsOf: '2021-03-17',
		},
	}),
	createRegulatoryLore({
		fixtureId: 'kr-depositor-protection-act-20260102',
		title: '예금자보호법 — 보호 제도의 법적 근거',
		summary: '예금보험 제도와 보호 대상 확인에 필요한 법적 근거의 교육용 요약.',
		content:
			'실제 대한민국 법령의 교육용 요약입니다. 예금자보호법은 부보금융회사가 예금을 지급할 수 없는 상황에 대비한 예금보험 제도를 규정합니다. 보호 여부와 한도는 금융회사, 상품 유형, 예금자, 적용 시점에 따라 달라질 수 있으므로 상품명만으로 단정해서는 안 됩니다. 펀드처럼 운용 실적에 따라 가치가 변하는 투자상품은 일반적인 예금과 동일하게 취급되지 않습니다. 특정 상품의 보호 여부는 최신 법령과 예금보험공사의 공식 상품 정보를 함께 확인해야 합니다. 이 데모의 상품과 사용자 프로필은 모두 가상이며 이 요약은 법률 또는 금융 자문이 아닙니다.',
		keywords: ['예금자보호법', '예금보험', '보호 대상', '부보금융회사'],
		topics: ['예금자 보호', '대한민국 금융 규제'],
		dataAsOf: '2026-01-02',
		publicSource: {
			sourceId: 'KR-DPA-20260102',
			title: '예금자보호법',
			authority: '국가법령정보센터',
			jurisdiction: 'KR',
			documentType: 'LEGISLATION',
			sourceUrl: 'https://www.law.go.kr/LSW/lsInfoP.do?lsId=001537',
			publishedAt: '2025-10-01',
			retrievedAt: RETRIEVED_AT,
			license: 'KOREAN_LAW_TEXT',
			dataAsOf: '2026-01-02',
		},
	}),
	createRegulatoryLore({
		fixtureId: 'kr-deposit-limit-policy-20250901',
		title: '금융위원회 안내 — 예금보호 한도 1억 원 상향',
		summary: '2025년 9월 1일부터 적용된 예금보호 한도 상향에 관한 공개 정책 안내.',
		content:
			'금융위원회의 공개 정책자료를 출처 표시 조건에 따라 요약했습니다. 2025년 9월 1일부터 은행과 저축은행 등 관련 금융회사 및 상호금융권의 예금보호 한도가 기존 5천만 원에서 1억 원으로 상향되었습니다. 보호금액은 일반적으로 해당 금융회사에서 보호되는 원금과 이자를 합산해 판단하지만, 모든 금융상품이 보호되는 것은 아닙니다. 펀드처럼 운용실적에 연동되는 투자상품은 예금보호 대상 예금과 구분해야 합니다. 구체적인 보호 여부는 금융회사와 상품, 계약 시점별 최신 공식 정보를 확인해야 합니다. 이 데모의 상품과 사용자 프로필은 모두 가상이며 이 자료는 금융 자문이 아닙니다. 출처: 금융위원회·대한민국 정책브리핑.',
		keywords: ['예금보호 한도', '1억 원', '2025년 9월 1일', '보호 대상'],
		topics: ['예금자 보호', '금융위원회 정책 안내'],
		dataAsOf: '2025-09-01',
		publicSource: {
			sourceId: 'KR-FSC-DEPOSIT-LIMIT-20250901',
			title: '오는 9월 1일부터 예금보호 한도 5000만 원→1억 원으로 상향',
			authority: '금융위원회',
			jurisdiction: 'KR',
			documentType: 'POLICY_NOTICE',
			sourceUrl: 'https://www.korea.kr/news/policyNewsView.do?newsId=148943235',
			publishedAt: '2025-05-15',
			retrievedAt: RETRIEVED_AT,
			license: 'KOGL_TYPE_1_TEXT_ONLY',
			dataAsOf: '2025-09-01',
		},
	}),
] satisfies readonly LoreInfo[]);
