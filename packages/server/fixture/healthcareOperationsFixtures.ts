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
			title: 'DEMO — Northstar Appointment and Examination Rescheduling',
			generatedTitle: 'DEMO — Northstar Appointment and Examination Rescheduling',
			summary:
				'Fictional administrative workflow for coordinating appointment and examination schedule changes.',
			category: 'Technology',
			type: METADATA_TYPES.LORE,
			source: 'fictional-demo-fixture',
			content:
				'DEMO DATA ONLY. At fictional Northstar Demo Hospital, a requester verifies the demo encounter reference and preferred date, checks department availability, records the reason as an administrative note, and confirms both appointment and examination changes with the scheduling desk. Time-sensitive requests are escalated to the scheduling supervisor; this workflow does not assess symptoms or clinical urgency. This is fictional operational guidance, not medical advice.',
			characterIds: [HEALTHCARE_CHARACTER_ID],
			keywordList: ['appointment change', 'examination rescheduling', 'scheduling desk'],
			topicList: ['fictional healthcare administration'],
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
			title: 'DEMO — Northstar Admission and Discharge Administration',
			generatedTitle: 'DEMO — Northstar Admission and Discharge Administration',
			summary: 'Fictional checklist for administrative admission and discharge record coordination.',
			category: 'Other',
			type: METADATA_TYPES.LORE,
			source: 'fictional-demo-fixture',
			content:
				'DEMO DATA ONLY. At fictional Northstar Demo Hospital, authorized staff confirm the demo encounter identifier, required administrative forms, responsible department, billing handoff, and document-delivery preference. Clinical discharge decisions and treatment instructions are outside this workflow and must remain with qualified clinical staff. This is fictional operational guidance, not medical advice.',
			characterIds: [HEALTHCARE_CHARACTER_ID],
			keywordList: ['admission administration', 'discharge administration', 'forms'],
			topicList: ['fictional healthcare administration'],
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
				allowedRequesterRoles: ['nurse', 'doctor', 'admin_staff'],
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
			title: 'DEMO — Northstar Record Copy and Privacy Procedure',
			generatedTitle: 'DEMO — Northstar Record Copy and Privacy Procedure',
			summary:
				'Fictional identity, authorization, access, and correction procedure for record-copy requests.',
			category: 'Politics',
			type: METADATA_TYPES.LORE,
			source: 'fictional-demo-fixture',
			content:
				'DEMO DATA ONLY. At fictional Northstar Demo Hospital, record-copy and correction requests require the demo request form, identity-verification status, authorization scope, requested record category, delivery channel, and an audit entry. Staff must not disclose record content beyond the verified scope. This fixture contains no personal or patient information and is not a substitute for an applicable privacy policy.',
			characterIds: [HEALTHCARE_CHARACTER_ID],
			keywordList: ['record copy', 'privacy access', 'correction request'],
			topicList: ['fictional healthcare privacy administration'],
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
			title: 'DEMO — Northstar Billing Inquiry Workflow',
			generatedTitle: 'DEMO — Northstar Billing Inquiry Workflow',
			summary: 'Fictional workflow for routing billing questions and disputed line items.',
			category: 'Other',
			type: METADATA_TYPES.LORE,
			source: 'fictional-demo-fixture',
			content:
				'DEMO DATA ONLY. At fictional Northstar Demo Hospital, patient-support or administrative staff verify the demo invoice reference, categorize the question, attach the disputed fictional line item, and route it to the billing desk. Staff may explain workflow status but must not invent coverage, prices, refunds, or clinical justifications. This is fictional administrative guidance.',
			characterIds: [HEALTHCARE_CHARACTER_ID],
			keywordList: ['billing inquiry', 'invoice question', 'billing desk'],
			topicList: ['fictional healthcare billing administration'],
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
			title: 'DEMO — Northstar HIS Access Support',
			generatedTitle: 'DEMO — Northstar HIS Access Support',
			summary: 'Fictional role-aware HIS access request and account-support operating instructions.',
			category: 'Technology',
			type: METADATA_TYPES.LORE,
			source: 'fictional-demo-fixture',
			content:
				'DEMO DATA ONLY. At fictional Northstar Demo Hospital, HIS access support verifies the demo staff reference, requester role, requested module, supervisor approval status, and least-privilege access scope before routing the ticket. Passwords, access tokens, and personal staff details must never be entered into the ticket. Time-sensitive access issues follow the fictional service-desk escalation path.',
			characterIds: [HEALTHCARE_CHARACTER_ID],
			keywordList: ['HIS access', 'role permission', 'service desk'],
			topicList: ['fictional healthcare information system'],
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
