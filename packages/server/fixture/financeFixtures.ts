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

const DETAILED_DEPOSIT_PRODUCT_CONTENT = {
	cedarReserve: `DEMO DATA ONLY — 실제 판매 상품이 아닌 가상 데모 상품설명서입니다.

[상품 개요]
상품명: 가온 생활예비 통장
상품 유형: 자유롭게 입출금할 수 있는 가상 요구불예금
권장 용도: 생활비, 비상예비자금, 1년 이내 사용할 가능성이 있는 단기 자금
기준일: 2026-07-27

[가입 조건]
가입 대상은 가상 금융기관의 본인확인을 마친 만 19세 이상 개인이며, 1인 1계좌를 가정합니다. 모바일 또는 영업점에서 가입할 수 있고 계약 기간과 최소 유지기간은 없습니다. 가입금액 제한은 없지만 우대금리는 잔액 1천만 원 이하 구간에만 적용되는 것으로 설정했습니다.

[금리와 우대 조건]
예시 기본금리는 세전 연 1.20%입니다. 전월 급여성 입금 50만 원 이상이면 연 0.40%포인트, 전월 공과금 자동납부 2건 이상이면 연 0.20%포인트, 월말 잔액 100만 원 이상이면 연 0.20%포인트를 더해 최대 세전 연 2.00%를 가정합니다. 각 조건은 매월 다시 판단하며 충족하지 못한 달에는 해당 우대금리를 적용하지 않습니다. 모든 금리와 조건은 데모용 가상 값입니다.

[이자 계산과 지급]
매일의 최종 잔액에 해당 일의 적용금리를 곱해 일 단위로 계산하고, 3월·6월·9월·12월의 마지막 토요일 다음 날에 원금에 더하는 방식을 가정합니다. 세금 공제 전 표시이며 실제 수령액은 적용 세율과 잔액 변동에 따라 달라질 수 있습니다.

[입출금과 해지]
영업시간과 무관하게 입출금할 수 있는 것으로 설정했지만, 이체한도·점검시간·사고신고·질권 설정 등 계좌 상태에 따라 거래가 제한될 수 있습니다. 만기가 없으므로 중도해지이율은 없고, 계좌를 해지하면 해지일까지 계산한 이자를 함께 지급하는 것으로 가정합니다.

[예금자보호와 주요 위험]
이 상품은 예금자보호 제도를 설명할 때 보호 대상 예금의 예시로 분류한 가상 상품입니다. 실제 금융회사나 실제 보호대상 상품을 뜻하지 않습니다. 실제 보호 여부와 한도는 최신 법령, 예금보험공사 정보와 해당 금융회사의 약관을 확인해야 합니다. 시장가격 손실을 가정한 투자상품은 아니지만, 우대조건 미충족·세금·물가상승 때문에 기대한 실질수익을 얻지 못할 수 있습니다.

[자료 출처와 가상화 범위]
우체국금융개발원의 공개 예금상품 데이터에서 상품명·가입조건·상품종류·우대혜택 같은 컬럼 구조만 참고했습니다. 상품명, 발행기관, 금리, 한도, 가입 대상, 우대조건과 모든 계약 조건은 데모를 위해 새로 만든 값입니다. 금융 또는 법률 자문이 아닙니다.`,
	saebomSixMonth: `DEMO DATA ONLY — 실제 판매 상품이 아닌 가상 데모 상품설명서입니다.

[상품 개요]
상품명: 새봄 6개월 정기예금
상품 유형: 목돈을 한 번에 맡기는 가상 거치식 정기예금
권장 용도: 6개월 동안 사용 계획이 없는 단기 목적자금
계약 기간: 6개월
기준일: 2026-07-27

[가입 조건]
가상 금융기관의 본인확인을 마친 만 19세 이상 개인이 모바일 또는 영업점에서 가입하는 것으로 가정합니다. 가입금액은 100만 원 이상 1억 원 이하이며 계약할 때 전액을 한 번에 납입합니다. 추가 납입과 일부 인출은 허용하지 않습니다.

[약정금리와 이자]
예시 약정금리는 세전 연 2.15%의 고정금리입니다. 실제 판매금리가 아닙니다. 이자는 가입금액에 연이율과 실제 예치일수를 반영한 단리 방식으로 계산해 만기일에 원금과 함께 지급하는 것으로 가정합니다. 표시금리는 연 환산 수치이므로 6개월 실제 이자액은 원금의 2.15%와 같지 않습니다. 세금 공제 후 수령액도 달라집니다.

[중도해지]
만기 전 전액 해지만 가능하고 일부해지는 불가능한 것으로 설정했습니다. 가입 후 1개월 미만은 세전 연 0.10%, 1개월 이상 3개월 미만은 연 0.50%, 3개월 이상 6개월 미만은 연 1.00%의 가상 중도해지이율을 적용합니다. 따라서 6개월 전에 자금이 필요하면 약정금리보다 이자가 크게 줄 수 있습니다.

[만기 처리]
만기일에 원금과 세후 이자를 지정 계좌로 지급합니다. 자동 재예치는 제공하지 않는 것으로 가정하며, 만기 후 찾아가지 않은 금액에는 만기 당시 약정금리가 아니라 별도의 낮은 가상 만기후이율이 적용됩니다.

[예금자보호와 확인사항]
이 상품은 예금자보호 제도를 설명할 때 보호 대상 예금의 예시로 분류한 가상 상품일 뿐 실제 보호대상임을 보장하지 않습니다. 실제 계약 전에는 금융회사, 상품별 보호 여부와 동일 금융회사 내 합산 보호한도를 최신 공식 자료에서 확인해야 합니다. 가입 전 6개월 내 사용할 돈과 비상자금은 따로 남겨 두는 것이 중요합니다.

[자료 출처와 가상화 범위]
우체국금융개발원 공개 데이터의 상품 정보 컬럼 구조만 참고했습니다. 상품명, 발행기관, 금리, 가입금액, 중도해지 구간과 모든 조건은 가상입니다. 금융 또는 법률 자문이 아닙니다.`,
	daeonOneYear: `DEMO DATA ONLY — 실제 판매 상품이 아닌 가상 데모 상품설명서입니다.

[상품 개요]
상품명: 다온 1년 자유적금
상품 유형: 매월 원하는 금액을 넣는 가상 자유적립식 적금
권장 용도: 월급에서 일정 금액을 1년 동안 나누어 모으는 목표자금
계약 기간: 12개월
기준일: 2026-07-27

[가입과 납입]
가상 금융기관의 본인확인을 마친 만 19세 이상 개인이 1인 1계좌로 가입하는 것을 가정합니다. 첫 납입금은 1만 원 이상이며, 이후 월 1만 원부터 50만 원까지 1만 원 단위로 자유롭게 납입할 수 있습니다. 월별 미납이 계약 해지를 뜻하지는 않지만 납입하지 않은 금액에는 이자가 생기지 않습니다. 총 납입한도는 600만 원입니다.

[기본금리와 우대금리]
예시 기본금리는 세전 연 2.60%입니다. 전체 계약기간 중 자동이체로 10회 이상 납입하면 연 0.25%포인트, 만기까지 중도 인출이나 해지 없이 유지하면 연 0.15%포인트를 더해 최대 세전 연 3.00%를 가정합니다. 우대조건은 만기 때 최종 확인하며 실제 판매조건이 아닙니다.

[이자 계산]
각 납입금이 들어온 날부터 만기 전날까지의 실제 예치일수에 해당 금리를 적용해 단리로 계산합니다. 매월 같은 금액을 넣더라도 먼저 낸 돈이 더 오래 예치되므로 더 많은 이자가 붙습니다. 광고된 연이율을 총 납입액 전체에 1년간 적용하는 상품이 아니며 세금 공제 후 수령액은 더 적습니다.

[중도해지와 만기]
일부 인출은 제공하지 않으며 만기 전 해지하면 전체 계약을 해지하는 것으로 가정합니다. 3개월 미만은 세전 연 0.10%, 3개월 이상 6개월 미만은 연 0.60%, 6개월 이상 12개월 미만은 연 1.20%의 가상 중도해지이율을 각 납입금의 실제 예치기간에 적용합니다. 만기에는 원금과 세후 이자를 지정 계좌로 지급하며 자동 재예치는 하지 않습니다.

[예금자보호와 확인사항]
이 상품은 예금자보호 제도를 설명할 때 보호 대상 예금의 예시로 분류한 가상 상품입니다. 실제 금융회사나 보호상품을 가리키지 않습니다. 월 납입 여력이 줄어들 가능성, 비상자금 필요와 중도해지 불이익을 가입 전에 확인해야 합니다.

[자료 출처와 가상화 범위]
우체국금융개발원 공개 데이터의 상품 정보 컬럼 구조만 참고했습니다. 상품명, 기관, 금리, 납입한도, 우대조건과 해지이율은 모두 가상입니다. 금융 또는 법률 자문이 아닙니다.`,
	harborThreeYear: `DEMO DATA ONLY — 실제 판매 상품이 아닌 가상 데모 상품설명서입니다.

[상품 개요]
상품명: 누리 3년 정기예금
상품 유형: 목돈을 36개월 동안 맡기는 가상 거치식 정기예금
권장 용도: 3년 동안 사용할 계획이 없는 목돈의 안정적 운용
계약 기간: 36개월
기준일: 2026-07-27

[가입 조건]
가상 금융기관의 본인확인을 마친 만 19세 이상 개인이 모바일 또는 영업점에서 가입하는 것으로 가정합니다. 가입금액은 100만 원 이상 1억 원 이하이며 계약 시 전액을 한 번에 납입합니다. 계약 후 추가 납입과 일부 인출은 허용하지 않습니다.

[약정금리와 이자 지급]
예시 약정금리는 세전 연 3.10%의 고정금리이며 실제 판매금리가 아닙니다. 기본형은 가입금액에 연이율과 실제 예치일수를 반영한 단리 이자를 만기일에 원금과 함께 지급합니다. 월복리나 매월 이자지급식 상품이 아닙니다. 세금 공제 전 연 환산 금리이므로 표시금리만으로 실제 만기수령액을 판단해서는 안 됩니다.

[중도해지]
만기 전 전액 해지만 가능하고 일부해지는 불가능한 것으로 설정했습니다. 3개월 미만은 세전 연 0.10%, 3개월 이상 12개월 미만은 연 0.70%, 12개월 이상 24개월 미만은 연 1.30%, 24개월 이상 36개월 미만은 연 1.80%의 가상 중도해지이율을 적용합니다. 약정기간에 가까워도 만기 전에 해지하면 연 3.10%를 적용받지 못합니다.

[만기와 만기 후 처리]
만기일에 원금과 세후 이자를 지정 계좌로 지급합니다. 자동 재예치는 제공하지 않는 것으로 가정합니다. 만기 후 미수령 금액에는 만기 당시의 약정금리가 아니라 별도의 낮은 가상 만기후이율이 적용되므로 만기일과 지급계좌를 미리 확인해야 합니다.

[유동성과 적합한 자금]
계약기간은 36개월이고 중도해지 불이익이 커 유동성은 낮습니다. 3년 이내 이사비·학비·비상지출에 사용할 가능성이 있는 돈에는 맞지 않을 수 있습니다. 가입 전 생활비와 비상예비자금을 별도로 확보했다는 전제가 필요합니다.

[예금자보호와 확인사항]
이 상품은 예금자보호 제도를 설명할 때 보호 대상 예금의 예시로 분류한 가상 상품입니다. 실제 금융회사나 보호대상 상품을 뜻하지 않습니다. 실제 계약 전에는 해당 금융회사의 보호대상 표시, 동일 금융회사 내 합산 보호한도, 최신 약관을 확인해야 합니다.

[자료 출처와 가상화 범위]
우체국금융개발원 공개 데이터의 상품 정보 컬럼 구조만 참고했습니다. 상품명, 발행기관, 금리, 가입한도, 해지이율과 모든 조건은 가상입니다. 금융 또는 법률 자문이 아닙니다.`,
} as const;

const DETAILED_DEPOSIT_DISCLOSURE_CONTENT = {
	cedarReserve: `DEMO DATA ONLY — 가온 생활예비 통장의 가상 핵심 유의사항입니다.

1. 기본금리 연 1.20%와 최대 연 2.00%는 세전 가상 수치입니다. 우대금리는 급여성 입금, 공과금 자동납부, 월말 잔액 조건을 매월 충족한 경우에만 해당 월 잔액 1천만 원 이하 구간에 적용됩니다.
2. 수시입출금이 가능해도 이체한도, 시스템 점검, 사고신고와 계좌 상태에 따라 즉시 출금하지 못할 수 있습니다.
3. 이자는 매일의 최종 잔액을 기준으로 계산하므로 월말 잔액만 유지했다고 전체 기간에 같은 이자가 붙지 않습니다.
4. 표시금리는 세금과 물가상승을 반영하지 않습니다. 세후 수령이자와 실질 구매력은 더 낮을 수 있습니다.
5. 이 상품은 예금자보호 제도를 설명할 때 보호 대상 예금의 예시로 분류한 가상 상품입니다. 실제 보호 여부는 금융회사·상품·계약 시점의 최신 공식 정보로 확인해야 합니다.
6. 상품명, 금융기관, 금리, 한도와 조건은 모두 데모용으로 창작했습니다.`,
	saebomSixMonth: `DEMO DATA ONLY — 새봄 6개월 정기예금의 가상 핵심 유의사항입니다.

1. 세전 연 2.15%는 1년 기준으로 환산한 가상 고정금리입니다. 6개월 실제 이자가 원금의 2.15%라는 뜻이 아니며 세금 공제 후 수령액은 더 적습니다.
2. 가입 후 추가 납입과 일부 인출은 허용하지 않습니다. 자금이 필요하면 계약 전액을 중도해지해야 합니다.
3. 1개월 미만 연 0.10%, 1~3개월 연 0.50%, 3~6개월 연 1.00%의 가상 중도해지이율은 약정금리보다 낮습니다.
4. 자동 재예치는 없으며 만기 후 찾아가지 않은 금액에는 별도의 낮은 만기후이율이 적용되는 것으로 가정합니다.
5. 이 상품은 예금자보호 제도를 설명하기 위한 가상 보호 대상 예시이며 실제 금융회사나 보호상품을 뜻하지 않습니다. 동일 금융회사 내 다른 보호예금과 합산하는 실제 제도는 최신 공식 자료에서 확인해야 합니다.
6. 비상자금이나 6개월 안에 사용할 가능성이 있는 돈은 가입금액에서 제외해야 합니다. 모든 상품 조건은 가상입니다.`,
	daeonOneYear: `DEMO DATA ONLY — 다온 1년 자유적금의 가상 핵심 유의사항입니다.

1. 세전 연 2.60% 기본금리와 최대 연 3.00% 우대금리는 가상 값입니다. 자동이체 10회와 만기 유지 조건을 충족하지 않으면 해당 우대금리를 받을 수 없습니다.
2. 각 월 납입금은 입금일부터 만기 전날까지만 이자가 붙습니다. 총 납입액 전체에 표시 연이율을 1년간 적용하지 않습니다.
3. 월 납입한도는 50만 원, 총 납입한도는 600만 원으로 가정합니다. 미납한 달의 금액을 나중에 한꺼번에 넣지 못할 수 있습니다.
4. 일부 인출은 없고 중도해지하면 각 납입금에 낮은 가상 중도해지이율이 적용됩니다.
5. 이 상품의 예금자보호 분류는 교육용 가상 예시이며 실제 보호 여부를 보장하지 않습니다.
6. 소득 감소나 지출 증가에도 12개월 동안 감당할 수 있는 월 납입액인지 확인해야 합니다. 상품명과 모든 조건은 가상입니다.`,
	harborThreeYear: `DEMO DATA ONLY — 누리 3년 정기예금의 가상 핵심 유의사항입니다.

1. 세전 연 3.10%는 36개월 만기 유지 시 적용하는 가상 고정금리입니다. 세금 공제 전 수치이며 실제 판매금리가 아닙니다.
2. 가입 후 추가 납입과 일부 인출은 불가능합니다. 만기 전에 자금이 필요하면 계약 전액을 해지해야 합니다.
3. 가상 중도해지이율은 3개월 미만 연 0.10%, 3~12개월 연 0.70%, 12~24개월 연 1.30%, 24~36개월 연 1.80%입니다. 만기에 가까워도 약정금리를 모두 받는 것은 아닙니다.
4. 자동 재예치는 없으며 만기 후에는 별도의 낮은 만기후이율을 적용하는 것으로 가정합니다.
5. 3년 이내 이사비, 학비, 주택자금이나 비상지출에 쓸 가능성이 있는 돈에는 유동성 제약이 큽니다.
6. 이 상품의 예금자보호 분류는 제도 설명용 가상 예시입니다. 실제 보호대상과 한도는 최신 공식 자료와 계약 약관으로 확인해야 합니다.
7. 상품명, 발행기관, 금리, 가입한도와 모든 계약 조건은 데모용으로 창작했습니다.`,
} as const;

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
			content: DETAILED_DEPOSIT_PRODUCT_CONTENT.cedarReserve,
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
		fixtureId: 'saebom-six-month-deposit',
		kind: 'product',
		dataVersion: DEMO_FIXTURE_DATA_VERSION,
		lore: {
			loreId: 'saebom-six-month-deposit_demo-lore',
			userId: FINANCE_FIXTURE_OWNER_ID,
			createdAt: FIXTURE_TIMESTAMP,
			updatedAt: FIXTURE_TIMESTAMP,
			title: 'DEMO — 새봄 6개월 정기예금',
			generatedTitle: 'DEMO — 새봄 6개월 정기예금',
			summary: '공공 예금상품 데이터의 구조만 참고해 만든 가상의 저위험 6개월 단기 정기예금.',
			category: 'Concept',
			type: METADATA_TYPES.LORE,
			source: 'fictional-demo-fixture',
			content: DETAILED_DEPOSIT_PRODUCT_CONTENT.saebomSixMonth,
			characterIds: [FINANCE_CHARACTER_ID],
			keywordList: ['6개월 정기예금', '단기 예금', '저위험', '중간 유동성'],
			topicList: ['fictional financial product'],
			entityList: ['SAEBOM-SIX-MONTH'],
			domain: 'finance',
			fixtureId: 'saebom-six-month-deposit',
			isDemoData: true,
			dataVersion: DEMO_FIXTURE_DATA_VERSION,
			dataAsOf: '2026-07-27',
			structuredMetadata: {
				domain: 'finance',
				knowledgeType: 'product',
				productCode: 'SAEBOM-SIX-MONTH',
				productCategory: 'term_deposit',
				depositProtection: 'fictional_example_eligible',
				riskLevel: 'low',
				minimumHorizonMonths: 6,
				liquidityLevel: 'medium',
				fictionalization: POST_DEPOSIT_FICTIONALIZATION,
			},
		},
	},
	{
		fixtureId: 'daeon-one-year-savings',
		kind: 'product',
		dataVersion: DEMO_FIXTURE_DATA_VERSION,
		lore: {
			loreId: 'daeon-one-year-savings_demo-lore',
			userId: FINANCE_FIXTURE_OWNER_ID,
			createdAt: FIXTURE_TIMESTAMP,
			updatedAt: FIXTURE_TIMESTAMP,
			title: 'DEMO — 다온 1년 자유적금',
			generatedTitle: 'DEMO — 다온 1년 자유적금',
			summary: '공공 예금상품 데이터의 구조만 참고해 만든 가상의 저위험 1년 자유적립식 상품.',
			category: 'Concept',
			type: METADATA_TYPES.LORE,
			source: 'fictional-demo-fixture',
			content: DETAILED_DEPOSIT_PRODUCT_CONTENT.daeonOneYear,
			characterIds: [FINANCE_CHARACTER_ID],
			keywordList: ['1년 자유적금', '매월 저축', '자유적립식', '자동이체'],
			topicList: ['fictional financial product'],
			entityList: ['DAEON-ONE-YEAR'],
			domain: 'finance',
			fixtureId: 'daeon-one-year-savings',
			isDemoData: true,
			dataVersion: DEMO_FIXTURE_DATA_VERSION,
			dataAsOf: '2026-07-27',
			structuredMetadata: {
				domain: 'finance',
				knowledgeType: 'product',
				productCode: 'DAEON-ONE-YEAR',
				productCategory: 'installment_savings',
				depositProtection: 'fictional_example_eligible',
				riskLevel: 'low',
				minimumHorizonMonths: 12,
				liquidityLevel: 'medium',
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
			content: DETAILED_DEPOSIT_PRODUCT_CONTENT.harborThreeYear,
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
		fixtureId: 'ongyeol-short-bond-portfolio',
		kind: 'product',
		dataVersion: DEMO_FIXTURE_DATA_VERSION,
		lore: {
			loreId: 'ongyeol-short-bond-portfolio_demo-lore',
			userId: FINANCE_FIXTURE_OWNER_ID,
			createdAt: FIXTURE_TIMESTAMP,
			updatedAt: FIXTURE_TIMESTAMP,
			title: 'DEMO — 온결 단기채권 포트폴리오',
			generatedTitle: 'DEMO — 온결 단기채권 포트폴리오',
			summary: 'Fictional low-risk bond portfolio with a two-year minimum horizon and market risk.',
			category: 'Concept',
			type: METADATA_TYPES.LORE,
			source: 'fictional-demo-fixture',
			content:
				'DEMO DATA ONLY. 가상 데모 상품입니다. 온결 단기채권 포트폴리오는 가상의 단기 국공채와 우량채권에 분산하는 저위험 펀드입니다. 예시 최소 투자 기간은 24개월이며 환매에는 가상의 영업일 기준 3일이 걸립니다. 금리와 신용시장 변화로 평가금액이 하락하고 원금 손실이 발생할 수 있습니다. 정기예금과 달리 약정 이율이 없고 예금자보호 대상도 아닙니다. 이 상품과 모든 수치는 전적으로 가상이며 금융 자문이 아닙니다.',
			characterIds: [FINANCE_CHARACTER_ID],
			keywordList: ['단기채권', '저위험 펀드', '2년 투자', '원금 손실 가능'],
			topicList: ['fictional financial product'],
			entityList: ['ONGYEOL-SHORT-BOND'],
			domain: 'finance',
			fixtureId: 'ongyeol-short-bond-portfolio',
			isDemoData: true,
			dataVersion: DEMO_FIXTURE_DATA_VERSION,
			dataAsOf: '2026-07-27',
			structuredMetadata: {
				domain: 'finance',
				knowledgeType: 'product',
				productCode: 'ONGYEOL-SHORT-BOND',
				productCategory: 'fund',
				depositProtection: 'not_eligible',
				riskLevel: 'low',
				minimumHorizonMonths: 24,
				liquidityLevel: 'medium',
			},
		},
	},
	{
		fixtureId: 'hanul-balanced-portfolio',
		kind: 'product',
		dataVersion: DEMO_FIXTURE_DATA_VERSION,
		lore: {
			loreId: 'hanul-balanced-portfolio_demo-lore',
			userId: FINANCE_FIXTURE_OWNER_ID,
			createdAt: FIXTURE_TIMESTAMP,
			updatedAt: FIXTURE_TIMESTAMP,
			title: 'DEMO — 한울 균형 포트폴리오',
			generatedTitle: 'DEMO — 한울 균형 포트폴리오',
			summary: 'Fictional medium-risk balanced portfolio with a three-year minimum horizon.',
			category: 'Concept',
			type: METADATA_TYPES.LORE,
			source: 'fictional-demo-fixture',
			content:
				'DEMO DATA ONLY. 가상 데모 상품입니다. 한울 균형 포트폴리오는 가상의 국내외 채권 60%와 주식 40%에 분산하는 중위험 펀드입니다. 예시 최소 투자 기간은 36개월이고 환매에는 가상의 영업일 기준 4일이 걸립니다. 시장 변화에 따라 원금 손실이 발생할 수 있으며, 3년을 유지해도 손실을 피할 수 있다는 보장은 없습니다. 정기예금보다 기대 변동성이 높고 약정 이율이 없으며 예금자보호 대상이 아닙니다. 이 상품과 자산배분 수치는 전적으로 가상이며 금융 자문이 아닙니다.',
			characterIds: [FINANCE_CHARACTER_ID],
			keywordList: ['균형 포트폴리오', '중간 위험', '3년 투자', '채권 주식 분산'],
			topicList: ['fictional financial product'],
			entityList: ['HANUL-BALANCED'],
			domain: 'finance',
			fixtureId: 'hanul-balanced-portfolio',
			isDemoData: true,
			dataVersion: DEMO_FIXTURE_DATA_VERSION,
			dataAsOf: '2026-07-27',
			structuredMetadata: {
				domain: 'finance',
				knowledgeType: 'product',
				productCode: 'HANUL-BALANCED',
				productCategory: 'fund',
				depositProtection: 'not_eligible',
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
		fixtureId: 'saebom-six-month-deposit-disclosure',
		kind: 'disclosure',
		productFixtureId: 'saebom-six-month-deposit',
		dataVersion: DEMO_FIXTURE_DATA_VERSION,
		lore: {
			loreId: 'saebom-six-month-deposit-disclosure_demo-lore',
			userId: FINANCE_FIXTURE_OWNER_ID,
			createdAt: FIXTURE_TIMESTAMP,
			updatedAt: FIXTURE_TIMESTAMP,
			title: 'DEMO — 새봄 6개월 정기예금 유의사항',
			generatedTitle: 'DEMO — 새봄 6개월 정기예금 유의사항',
			summary: '가상의 단기 예금 이율, 중도해지 불이익, 보호 표시 한계를 설명하는 유의사항.',
			category: 'Concept',
			type: METADATA_TYPES.LORE,
			source: 'fictional-demo-fixture',
			content: DETAILED_DEPOSIT_DISCLOSURE_CONTENT.saebomSixMonth,
			characterIds: [FINANCE_CHARACTER_ID],
			keywordList: ['6개월 중도해지', '가상 이율', '단기 예금 유의사항'],
			topicList: ['fictional product disclosure'],
			entityList: ['SAEBOM-SIX-MONTH'],
			domain: 'finance',
			fixtureId: 'saebom-six-month-deposit-disclosure',
			isDemoData: true,
			dataVersion: DEMO_FIXTURE_DATA_VERSION,
			dataAsOf: '2026-07-27',
			structuredMetadata: {
				domain: 'finance',
				knowledgeType: 'disclosure',
				productFixtureId: 'saebom-six-month-deposit',
				disclosureCode: 'SAEBOM-SIX-MONTH-DISCLOSURE',
			},
		},
	},
	{
		fixtureId: 'daeon-one-year-savings-disclosure',
		kind: 'disclosure',
		productFixtureId: 'daeon-one-year-savings',
		dataVersion: DEMO_FIXTURE_DATA_VERSION,
		lore: {
			loreId: 'daeon-one-year-savings-disclosure_demo-lore',
			userId: FINANCE_FIXTURE_OWNER_ID,
			createdAt: FIXTURE_TIMESTAMP,
			updatedAt: FIXTURE_TIMESTAMP,
			title: 'DEMO — 다온 1년 자유적금 유의사항',
			generatedTitle: 'DEMO — 다온 1년 자유적금 유의사항',
			summary: '가상의 우대이율, 월별 납입, 중도해지 조건을 설명하는 유의사항.',
			category: 'Concept',
			type: METADATA_TYPES.LORE,
			source: 'fictional-demo-fixture',
			content: DETAILED_DEPOSIT_DISCLOSURE_CONTENT.daeonOneYear,
			characterIds: [FINANCE_CHARACTER_ID],
			keywordList: ['적금 중도해지', '자동이체 우대', '월별 납입'],
			topicList: ['fictional product disclosure'],
			entityList: ['DAEON-ONE-YEAR'],
			domain: 'finance',
			fixtureId: 'daeon-one-year-savings-disclosure',
			isDemoData: true,
			dataVersion: DEMO_FIXTURE_DATA_VERSION,
			dataAsOf: '2026-07-27',
			structuredMetadata: {
				domain: 'finance',
				knowledgeType: 'disclosure',
				productFixtureId: 'daeon-one-year-savings',
				disclosureCode: 'DAEON-ONE-YEAR-DISCLOSURE',
			},
		},
	},
	{
		fixtureId: 'ongyeol-short-bond-portfolio-disclosure',
		kind: 'disclosure',
		productFixtureId: 'ongyeol-short-bond-portfolio',
		dataVersion: DEMO_FIXTURE_DATA_VERSION,
		lore: {
			loreId: 'ongyeol-short-bond-portfolio-disclosure_demo-lore',
			userId: FINANCE_FIXTURE_OWNER_ID,
			createdAt: FIXTURE_TIMESTAMP,
			updatedAt: FIXTURE_TIMESTAMP,
			title: 'DEMO — 온결 단기채권 포트폴리오 유의사항',
			generatedTitle: 'DEMO — 온결 단기채권 포트폴리오 유의사항',
			summary:
				'Fictional disclosure covering bond-market loss, redemption timing, and no deposit protection.',
			category: 'Concept',
			type: METADATA_TYPES.LORE,
			source: 'fictional-demo-fixture',
			content:
				'DEMO DATA ONLY. 가상 데모 유의사항입니다. 온결 단기채권 포트폴리오는 저위험으로 분류되지만 원금을 보장하지 않습니다. 시장금리 상승, 신용위험 또는 유동성 악화로 평가손실이 발생할 수 있고 환매 대금 지급까지 가상의 영업일 기준 3일이 필요합니다. 예금이 아니므로 예금자보호 대상이 아닙니다. 모든 구성과 수치는 가상입니다.',
			characterIds: [FINANCE_CHARACTER_ID],
			keywordList: ['채권 가격 하락', '환매 기간', '예금자보호 제외'],
			topicList: ['fictional product disclosure'],
			entityList: ['ONGYEOL-SHORT-BOND'],
			domain: 'finance',
			fixtureId: 'ongyeol-short-bond-portfolio-disclosure',
			isDemoData: true,
			dataVersion: DEMO_FIXTURE_DATA_VERSION,
			dataAsOf: '2026-07-27',
			structuredMetadata: {
				domain: 'finance',
				knowledgeType: 'disclosure',
				productFixtureId: 'ongyeol-short-bond-portfolio',
				disclosureCode: 'ONGYEOL-SHORT-BOND-DISCLOSURE',
			},
		},
	},
	{
		fixtureId: 'hanul-balanced-portfolio-disclosure',
		kind: 'disclosure',
		productFixtureId: 'hanul-balanced-portfolio',
		dataVersion: DEMO_FIXTURE_DATA_VERSION,
		lore: {
			loreId: 'hanul-balanced-portfolio-disclosure_demo-lore',
			userId: FINANCE_FIXTURE_OWNER_ID,
			createdAt: FIXTURE_TIMESTAMP,
			updatedAt: FIXTURE_TIMESTAMP,
			title: 'DEMO — 한울 균형 포트폴리오 유의사항',
			generatedTitle: 'DEMO — 한울 균형 포트폴리오 유의사항',
			summary:
				'Fictional disclosure covering balanced-fund volatility, loss, allocation drift, and liquidity.',
			category: 'Concept',
			type: METADATA_TYPES.LORE,
			source: 'fictional-demo-fixture',
			content:
				'DEMO DATA ONLY. 가상 데모 유의사항입니다. 한울 균형 포트폴리오의 채권 60%, 주식 40% 구성은 가상이며 시장 움직임에 따라 실제 비중을 가정한 값도 달라질 수 있습니다. 중위험 분류와 3년 투자 기간은 손실 방지를 보장하지 않습니다. 환매 시점의 시장가격에 따라 원금 손실이 확정될 수 있고 예금자보호 대상이 아닙니다.',
			characterIds: [FINANCE_CHARACTER_ID],
			keywordList: ['균형 펀드 변동성', '자산배분', '3년 손실 가능'],
			topicList: ['fictional product disclosure'],
			entityList: ['HANUL-BALANCED'],
			domain: 'finance',
			fixtureId: 'hanul-balanced-portfolio-disclosure',
			isDemoData: true,
			dataVersion: DEMO_FIXTURE_DATA_VERSION,
			dataAsOf: '2026-07-27',
			structuredMetadata: {
				domain: 'finance',
				knowledgeType: 'disclosure',
				productFixtureId: 'hanul-balanced-portfolio',
				disclosureCode: 'HANUL-BALANCED-DISCLOSURE',
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
			content: DETAILED_DEPOSIT_DISCLOSURE_CONTENT.cedarReserve,
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
			content: DETAILED_DEPOSIT_DISCLOSURE_CONTENT.harborThreeYear,
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
