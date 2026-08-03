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
			content: `DEMO DATA ONLY. Northstar Demo Hospital uses this administrative scheduling workflow:
1. Intake: record the demo encounter reference, requested appointment or examination, preferred date range, contact channel, and whether linked bookings must move together.
2. Verify scope: confirm the requester is authorized to discuss scheduling and avoid collecting symptoms or unnecessary personal details.
3. Check dependencies: review department availability, preparation windows, linked examinations, and any existing administrative holds.
4. Coordinate: send the proposed change to the scheduling desk and obtain confirmation before treating the booking as changed.
5. Close: record the administrative reason, old and new time, responsible desk, confirmation channel, and any unresolved dependency.
Time-sensitive administrative requests go to the scheduling supervisor. Possible clinical urgency is outside this workflow and must be handed to qualified clinical staff rather than assessed by the requester.`,
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
			content: `DEMO DATA ONLY. Northstar Demo Hospital separates admission and discharge administration from clinical decisions.
Admission coordination:
1. Confirm the demo encounter identifier, responsible department, requester role, and planned admission date.
2. Check that required administrative forms are present and route incomplete items to the owning administrative desk.
3. Record the billing handoff status and the patient's selected document-delivery and contact preferences.
4. Confirm completion with the receiving department and record any unresolved administrative dependency.
Discharge coordination:
1. Begin only after qualified clinical staff record the discharge decision; administrative staff never make that decision.
2. Confirm the encounter identifier, responsible department, required administrative documents, billing handoff, and delivery preference.
3. Route missing documents to their owner, record expected completion, and avoid inventing treatment instructions or clinical clearance.
4. Close the administrative checklist only when each handoff has an owner and status; escalate time-sensitive gaps to the operations supervisor.
Patient-support staff may explain status and coordinate the documented handoffs, but may not approve admission, discharge, treatment, or clinical instructions.`,
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
			title: 'DEMO — Northstar Record Copy and Privacy Procedure',
			generatedTitle: 'DEMO — Northstar Record Copy and Privacy Procedure',
			summary:
				'Fictional identity, authorization, access, and correction procedure for record-copy requests.',
			category: 'Politics',
			type: METADATA_TYPES.LORE,
			source: 'fictional-demo-fixture',
			content: `DEMO DATA ONLY. Northstar Demo Hospital uses this record-copy and correction-request workflow:
1. Intake: capture the demo request reference, request type, requested record category and date range, and preferred delivery channel.
2. Verify: record identity-verification status and the authorization scope without copying unnecessary identity data into free text.
3. Scope: compare the requested material with the verified authorization and pause any item outside that scope.
4. Route: send copy requests to records fulfillment and correction requests to the record-owning department; do not alter source records in the support workflow.
5. Audit: record who accepted the request, the route, status, delivery channel, and each disclosure decision.
6. Escalate: send ambiguous authority, privacy complaints, or time-sensitive exceptions to the privacy lead.
Staff must not disclose content beyond the verified scope or promise that a requested correction will be accepted.`,
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
			content: `DEMO DATA ONLY. Northstar Demo Hospital uses this billing-inquiry workflow:
1. Intake: confirm the demo invoice reference, requester contact channel, and whether the question concerns a payment status, invoice copy, line item, or disputed charge.
2. Verify: confirm the requester is authorized to discuss the invoice and avoid collecting payment-card or unnecessary personal data in notes.
3. Document: identify the questioned line item, amount shown on the demo invoice, service date shown, and the requester's stated reason without changing the source invoice.
4. Route: send invoice-copy and payment-status requests to billing support; send disputed line items to billing review with the relevant line attached.
5. Communicate: provide the ticket reference, owning desk, current status, and next update point.
6. Close or escalate: close only after the billing desk records an outcome; escalate duplicate charges, unresolved ownership, or missed update commitments to the billing supervisor.
Patient-support staff may explain process and status but must not invent coverage, prices, refunds, or clinical justification.`,
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
			content: `DEMO DATA ONLY. Northstar Demo Hospital uses this HIS access-support workflow:
1. Intake: record the demo staff reference, requester role, requested module, business task, access type, and requested duration.
2. Verify approval: confirm the named supervisor and approval status; support staff do not approve their own request.
3. Minimize scope: compare the request with the role template and route only the least-privilege access needed for the stated task.
4. Route: send new or changed access to identity administration; send login failures for existing access to the service desk.
5. Protect secrets: never place passwords, recovery codes, access tokens, or unnecessary personal staff details in the ticket.
6. Confirm and audit: record the owning team, ticket reference, granted scope or rejection reason, expiry when temporary, and requester notification.
Time-sensitive access failures follow the service-desk escalation path. Suspected unauthorized access is escalated to security and is not resolved by granting broader permissions.`,
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
