import { METADATA_TYPES } from '@rag-advisor-demo/shared/config';
import type { LoreInfo } from '@rag-advisor-demo/shared/domain';

import { deepFreeze, DEMO_FIXTURE_DATA_VERSION } from './fixtureUtils.js';

const HEALTHCARE_CHARACTER_ID = 'healthcare-operations-assistant_demo';
const FIXTURE_OWNER_ID = 'demo-fixture-user';
const FIXTURE_TIMESTAMP = '2026-07-24T00:00:00.000Z';

export interface HealthcareOperationsFixture {
	fixtureId: string;
	dataVersion: string;
	lore: LoreInfo;
}

export const HEALTHCARE_OPERATIONS_FIXTURES = deepFreeze([
	{
		fixtureId: 'northstar-appointment-rescheduling',
		dataVersion: DEMO_FIXTURE_DATA_VERSION,
		lore: {
			loreId: 'northstar-appointment-rescheduling_demo-lore',
			userId: FIXTURE_OWNER_ID,
			createdAt: FIXTURE_TIMESTAMP,
			updatedAt: FIXTURE_TIMESTAMP,
			title: 'DEMO — 노스스타 예약 및 검사 일정 변경',
			generatedTitle: 'DEMO — 노스스타 예약 및 검사 일정 변경',
			summary: '예약과 검사 일정을 변경할 때 사용하는 행정 조정 절차.',
			category: 'Technology',
			type: METADATA_TYPES.LORE,
			source: 'fictional-demo-fixture',
			content: `데모 데이터 전용. 노스스타 데모 병원은 다음과 같이 예약 및 검사 일정을 행정적으로 변경합니다.
1. 접수: 데모 진료 참조번호, 변경할 예약 또는 검사, 희망 날짜 범위, 연락 방법, 함께 변경해야 하는 연계 예약을 기록합니다.
2. 권한 확인: 요청자가 일정 정보를 논의할 권한이 있는지 확인하고 증상이나 불필요한 개인정보는 수집하지 않습니다.
3. 연계 조건 확인: 담당 부서의 가능 시간, 검사 준비 기간, 연계 검사와 기존 행정 보류 사항을 확인합니다.
4. 일정 조정: 변경안을 일정 담당 부서에 전달하고 확인을 받기 전에는 변경이 확정된 것으로 안내하지 않습니다.
5. 완료 기록: 변경 사유, 이전·변경 시간, 담당 부서, 확인 방법과 해결되지 않은 연계 사항을 기록합니다.
시간이 중요한 행정 요청은 일정 관리 책임자에게 전달합니다. 임상적 긴급성은 이 절차에서 판단하지 않고 자격을 갖춘 임상 담당자에게 연결합니다.`,
			characterIds: [HEALTHCARE_CHARACTER_ID],
			keywordList: [
				'예약 변경',
				'검사 일정 변경',
				'일정 담당 부서',
				'appointment change',
				'examination rescheduling',
			],
			topicList: ['의료 행정', 'healthcare administration'],
			entityList: ['DEMO-OPS-SCHEDULE-101'],
			domain: 'healthcare_operations',
			fixtureId: 'northstar-appointment-rescheduling',
			isDemoData: true,
			dataVersion: DEMO_FIXTURE_DATA_VERSION,
			dataAsOf: '2026-07-24',
			structuredMetadata: {
				domain: 'healthcare_operations',
				knowledgeType: 'workflow',
				workflowCode: 'DEMO-OPS-SCHEDULE-101',
				workflowTopic: 'appointment_rescheduling',
				allowedRequesterRoles: ['nurse', 'admin_staff', 'patient_support'],
				urgencyLevels: ['routine', 'time_sensitive'],
			},
		},
	},
	{
		fixtureId: 'northstar-admission-discharge-administration',
		dataVersion: DEMO_FIXTURE_DATA_VERSION,
		lore: {
			loreId: 'northstar-admission-discharge-administration_demo-lore',
			userId: FIXTURE_OWNER_ID,
			createdAt: FIXTURE_TIMESTAMP,
			updatedAt: FIXTURE_TIMESTAMP,
			title: 'DEMO — 노스스타 입원·퇴원 행정 절차',
			generatedTitle: 'DEMO — 노스스타 입원·퇴원 행정 절차',
			summary: '입원 및 퇴원 기록과 부서 간 인계를 조정하는 행정 체크리스트.',
			category: 'Other',
			type: METADATA_TYPES.LORE,
			source: 'fictional-demo-fixture',
			content: `데모 데이터 전용. 노스스타 데모 병원은 입원·퇴원 행정과 임상 결정을 분리합니다.
입원 행정:
1. 데모 진료 식별자, 담당 부서, 요청자 역할과 예정 입원일을 확인합니다.
2. 필요한 행정 서류가 준비되었는지 확인하고 미완료 항목은 해당 행정 담당 부서에 전달합니다.
3. 청구 부서 인계 상태와 문서 수령 및 연락 방법을 기록합니다.
4. 접수 부서에 완료 여부를 확인하고 해결되지 않은 행정 연계 사항을 기록합니다.
퇴원 행정:
1. 자격을 갖춘 임상 담당자가 퇴원 결정을 기록한 뒤에만 시작합니다. 행정 담당자는 퇴원을 결정하지 않습니다.
2. 진료 식별자, 담당 부서, 필요한 행정 문서, 청구 인계와 문서 수령 방법을 확인합니다.
3. 누락 문서는 담당 부서에 전달하고 예상 완료 시점을 기록합니다. 치료 지시나 임상적 승인 내용을 만들어 내지 않습니다.
4. 모든 인계에 담당자와 상태가 기록된 경우에만 행정 체크리스트를 종료합니다. 시간이 중요한 누락 사항은 운영 책임자에게 전달합니다.
환자 지원 담당자는 기록된 인계의 상태를 설명하고 조정할 수 있지만 입원, 퇴원, 치료 또는 임상 지시를 승인할 수 없습니다.`,
			characterIds: [HEALTHCARE_CHARACTER_ID],
			keywordList: [
				'입원 행정',
				'퇴원 행정',
				'행정 서류',
				'admission administration',
				'discharge administration',
			],
			topicList: ['의료 행정', 'healthcare administration'],
			entityList: ['DEMO-OPS-ADMIT-205'],
			domain: 'healthcare_operations',
			fixtureId: 'northstar-admission-discharge-administration',
			isDemoData: true,
			dataVersion: DEMO_FIXTURE_DATA_VERSION,
			dataAsOf: '2026-07-24',
			structuredMetadata: {
				domain: 'healthcare_operations',
				knowledgeType: 'workflow',
				workflowCode: 'DEMO-OPS-ADMIT-205',
				workflowTopic: 'admission_discharge',
				allowedRequesterRoles: ['nurse', 'doctor', 'admin_staff', 'patient_support'],
				urgencyLevels: ['routine', 'time_sensitive'],
			},
		},
	},
	{
		fixtureId: 'northstar-record-copy-and-privacy',
		dataVersion: DEMO_FIXTURE_DATA_VERSION,
		lore: {
			loreId: 'northstar-record-copy-and-privacy_demo-lore',
			userId: FIXTURE_OWNER_ID,
			createdAt: FIXTURE_TIMESTAMP,
			updatedAt: FIXTURE_TIMESTAMP,
			title: 'DEMO — 노스스타 기록 사본 및 개인정보 절차',
			generatedTitle: 'DEMO — 노스스타 기록 사본 및 개인정보 절차',
			summary: '기록 사본 요청의 본인 확인, 권한 범위, 제공 및 정정 처리 절차.',
			category: 'Politics',
			type: METADATA_TYPES.LORE,
			source: 'fictional-demo-fixture',
			content: `데모 데이터 전용. 노스스타 데모 병원은 다음과 같이 기록 사본 및 정정 요청을 처리합니다.
1. 접수: 데모 요청 참조번호, 요청 유형, 필요한 기록 종류와 기간, 희망 수령 방법을 기록합니다.
2. 본인 및 권한 확인: 불필요한 신원 정보를 자유 입력란에 복사하지 않고 본인 확인 상태와 위임 범위를 기록합니다.
3. 범위 확인: 요청 자료를 확인된 권한 범위와 비교하고 범위를 벗어난 항목은 처리를 보류합니다.
4. 담당 부서 전달: 사본 요청은 기록 제공 담당에, 정정 요청은 원 기록을 관리하는 부서에 전달합니다. 지원 절차에서 원 기록을 직접 변경하지 않습니다.
5. 처리 이력 기록: 접수자, 전달 부서, 처리 상태, 제공 방법과 각 제공 결정을 기록합니다.
6. 예외 전달: 권한이 불명확한 경우, 개인정보 관련 이의 또는 시간이 중요한 예외는 개인정보 보호 책임자에게 전달합니다.
확인된 권한 범위를 넘는 내용을 제공하거나 정정 요청이 승인될 것이라고 약속해서는 안 됩니다.`,
			characterIds: [HEALTHCARE_CHARACTER_ID],
			keywordList: [
				'기록 사본',
				'개인정보 열람',
				'정정 요청',
				'record copy',
				'privacy access',
				'correction request',
			],
			topicList: ['의료 개인정보 행정', 'healthcare privacy administration'],
			entityList: ['DEMO-OPS-PRIVACY-310'],
			domain: 'healthcare_operations',
			fixtureId: 'northstar-record-copy-and-privacy',
			isDemoData: true,
			dataVersion: DEMO_FIXTURE_DATA_VERSION,
			dataAsOf: '2026-07-24',
			structuredMetadata: {
				domain: 'healthcare_operations',
				knowledgeType: 'policy',
				workflowCode: 'DEMO-OPS-PRIVACY-310',
				workflowTopic: 'records_privacy',
				allowedRequesterRoles: ['admin_staff', 'patient_support'],
				urgencyLevels: ['routine', 'time_sensitive'],
			},
		},
	},
	{
		fixtureId: 'northstar-billing-inquiry',
		dataVersion: DEMO_FIXTURE_DATA_VERSION,
		lore: {
			loreId: 'northstar-billing-inquiry_demo-lore',
			userId: FIXTURE_OWNER_ID,
			createdAt: FIXTURE_TIMESTAMP,
			updatedAt: FIXTURE_TIMESTAMP,
			title: 'DEMO — 노스스타 청구 문의 절차',
			generatedTitle: 'DEMO — 노스스타 청구 문의 절차',
			summary: '청구 질문과 이의 제기된 항목을 확인하고 담당 부서에 전달하는 절차.',
			category: 'Other',
			type: METADATA_TYPES.LORE,
			source: 'fictional-demo-fixture',
			content: `데모 데이터 전용. 노스스타 데모 병원은 다음과 같이 청구 문의를 처리합니다.
1. 접수: 데모 청구서 참조번호, 요청자 연락 방법, 문의 유형이 납부 상태·청구서 사본·세부 항목·이의 제기 중 무엇인지 확인합니다.
2. 권한 확인: 요청자가 청구 정보를 논의할 권한이 있는지 확인하고 카드 정보나 불필요한 개인정보를 메모에 남기지 않습니다.
3. 문의 기록: 원 청구서를 변경하지 않고 문의한 세부 항목, 데모 청구서에 표시된 금액과 서비스 날짜, 요청자가 설명한 사유를 기록합니다.
4. 담당 부서 전달: 청구서 사본과 납부 상태 문의는 청구 지원 담당에, 이의 제기 항목은 해당 항목을 첨부해 청구 검토 담당에 전달합니다.
5. 진행 안내: 접수번호, 담당 부서, 현재 상태와 다음 안내 예정 시점을 알려 줍니다.
6. 종료 또는 상향 전달: 청구 담당 부서가 결과를 기록한 뒤에만 종료합니다. 중복 청구, 담당 불명 또는 안내 기한 누락은 청구 책임자에게 전달합니다.
환자 지원 담당자는 절차와 상태를 설명할 수 있지만 보장 범위, 가격, 환불 또는 임상적 사유를 만들어 내서는 안 됩니다.`,
			characterIds: [HEALTHCARE_CHARACTER_ID],
			keywordList: [
				'청구 문의',
				'청구서 질문',
				'청구 담당 부서',
				'billing inquiry',
				'invoice question',
			],
			topicList: ['의료 청구 행정', 'healthcare billing administration'],
			entityList: ['DEMO-OPS-BILLING-420'],
			domain: 'healthcare_operations',
			fixtureId: 'northstar-billing-inquiry',
			isDemoData: true,
			dataVersion: DEMO_FIXTURE_DATA_VERSION,
			dataAsOf: '2026-07-24',
			structuredMetadata: {
				domain: 'healthcare_operations',
				knowledgeType: 'workflow',
				workflowCode: 'DEMO-OPS-BILLING-420',
				workflowTopic: 'billing_inquiry',
				allowedRequesterRoles: ['admin_staff', 'patient_support'],
				urgencyLevels: ['routine', 'time_sensitive'],
			},
		},
	},
	{
		fixtureId: 'northstar-his-access',
		dataVersion: DEMO_FIXTURE_DATA_VERSION,
		lore: {
			loreId: 'northstar-his-access_demo-lore',
			userId: FIXTURE_OWNER_ID,
			createdAt: FIXTURE_TIMESTAMP,
			updatedAt: FIXTURE_TIMESTAMP,
			title: 'DEMO — 노스스타 병원정보시스템 접근 지원',
			generatedTitle: 'DEMO — 노스스타 병원정보시스템 접근 지원',
			summary: '역할에 따른 병원정보시스템 접근 요청과 계정 지원 절차.',
			category: 'Technology',
			type: METADATA_TYPES.LORE,
			source: 'fictional-demo-fixture',
			content: `데모 데이터 전용. 노스스타 데모 병원은 다음과 같이 병원정보시스템 접근을 지원합니다.
1. 접수: 데모 직원 참조번호, 요청자 역할, 필요한 모듈, 업무 목적, 접근 유형과 필요 기간을 기록합니다.
2. 승인 확인: 지정된 책임자와 승인 상태를 확인합니다. 지원 담당자는 자신의 요청을 직접 승인하지 않습니다.
3. 최소 권한 확인: 요청을 역할별 권한 기준과 비교하고 해당 업무에 필요한 최소 범위만 전달합니다.
4. 담당 부서 전달: 신규 또는 변경 접근은 계정·권한 관리 담당에, 기존 권한의 로그인 실패는 서비스 데스크에 전달합니다.
5. 비밀정보 보호: 비밀번호, 복구 코드, 접근 토큰 또는 불필요한 직원 개인정보를 접수 내용에 기록하지 않습니다.
6. 확인 및 이력 기록: 담당 팀, 접수번호, 부여된 범위 또는 거절 사유, 임시 권한의 만료일과 요청자 통보 여부를 기록합니다.
시간이 중요한 접근 장애는 서비스 데스크의 상향 전달 절차를 따릅니다. 무단 접근이 의심되면 보안 담당에 전달하며 권한을 넓혀 해결하지 않습니다.`,
			characterIds: [HEALTHCARE_CHARACTER_ID],
			keywordList: [
				'병원정보시스템 접근',
				'역할 권한',
				'서비스 데스크',
				'HIS access',
				'role permission',
			],
			topicList: ['의료 정보시스템', 'healthcare information system'],
			entityList: ['DEMO-OPS-HIS-515'],
			domain: 'healthcare_operations',
			fixtureId: 'northstar-his-access',
			isDemoData: true,
			dataVersion: DEMO_FIXTURE_DATA_VERSION,
			dataAsOf: '2026-07-24',
			structuredMetadata: {
				domain: 'healthcare_operations',
				knowledgeType: 'operations_guide',
				workflowCode: 'DEMO-OPS-HIS-515',
				workflowTopic: 'his_access',
				allowedRequesterRoles: ['nurse', 'doctor', 'admin_staff'],
				urgencyLevels: ['routine', 'time_sensitive'],
			},
		},
	},
] as const satisfies readonly HealthcareOperationsFixture[]);
