import {
	healthcareOperationsLoreStructuredMetadataSchema,
	type HealthcareOperationsSessionProfile,
	type LoreInfo,
	type RagContextAssumption,
	type RagExclusionReason,
	type RagStructuredFilterDecision,
} from '@rag-advisor-demo/shared/domain';

type HealthcareWorkflowTopic =
	| 'appointment_rescheduling'
	| 'admission_discharge'
	| 'records_privacy'
	| 'billing_inquiry'
	| 'his_access';

export interface HealthcareOperationsRequestOverrides {
	workflowTopic?: HealthcareWorkflowTopic;
	requesterRole?: HealthcareOperationsSessionProfile['requesterRole'];
	urgency?: HealthcareOperationsSessionProfile['urgency'];
}

export interface HealthcareOperationsFilterResult {
	eligibleLore: LoreInfo[];
	decisions: RagStructuredFilterDecision[];
	assumptions: RagContextAssumption[];
	requestOverrides: HealthcareOperationsRequestOverrides;
}

const detectWorkflowTopic = (message: string): HealthcareWorkflowTopic | undefined => {
	const normalized = message.toLowerCase();
	if (/appointment|examination|reschedul|예약|검사 일정|일정 변경/.test(normalized)) {
		return 'appointment_rescheduling';
	}
	if (/admission|discharge|입원|퇴원/.test(normalized)) return 'admission_discharge';
	if (
		/record copy|medical record|privacy|correction request|기록 사본|의무기록|개인정보/.test(
			normalized
		)
	) {
		return 'records_privacy';
	}
	if (/billing|invoice|charge|청구|수납/.test(normalized)) return 'billing_inquiry';
	if (/\bhis\b|system access|module access|account access|시스템 접근|계정 접근/.test(normalized)) {
		return 'his_access';
	}
	return undefined;
};

const detectRequesterRole = (
	message: string
): HealthcareOperationsRequestOverrides['requesterRole'] => {
	const normalized = message.toLowerCase();
	const hasOverrideIntent =
		/\b(?:as a|assume (?:i am|the requester is)|for this answer.*(?:role|perspective))\b/.test(
			normalized
		) || /(?:라고 가정|역할로|관점에서)/.test(normalized);
	if (!hasOverrideIntent) return undefined;
	if (/\bnurse\b|간호사/.test(normalized)) return 'nurse';
	if (/\bdoctor\b|\bphysician\b|의사/.test(normalized)) return 'doctor';
	if (/\badmin(?:istrative)? staff\b|행정 직원/.test(normalized)) return 'admin_staff';
	if (/\bpatient support\b|고객 지원|환자 지원/.test(normalized)) return 'patient_support';
	return undefined;
};

const detectUrgency = (message: string): HealthcareOperationsRequestOverrides['urgency'] => {
	const normalized = message.toLowerCase();
	if (/\btime[- ]sensitive\b|\burgent administrative\b|시간 민감|긴급 행정/.test(normalized)) {
		return 'time_sensitive';
	}
	if (/\broutine\b|일반 절차|정기 절차/.test(normalized)) return 'routine';
	return undefined;
};

export const analyzeHealthcareOperationsRequestOverrides = (
	message: string
): HealthcareOperationsRequestOverrides => ({
	workflowTopic: detectWorkflowTopic(message),
	requesterRole: detectRequesterRole(message),
	urgency: detectUrgency(message),
});

const buildAssumptions = (
	overrides: HealthcareOperationsRequestOverrides
): RagContextAssumption[] => {
	const assumptions: RagContextAssumption[] = [];
	if (overrides.workflowTopic) {
		assumptions.push({
			source: 'current_request',
			description: `Temporary workflow topic: ${overrides.workflowTopic}.`,
		});
	}
	if (overrides.requesterRole) {
		assumptions.push({
			source: 'current_request',
			description: `Temporary requester role: ${overrides.requesterRole}.`,
		});
	}
	if (overrides.urgency) {
		assumptions.push({
			source: 'current_request',
			description: `Temporary operational urgency: ${overrides.urgency}.`,
		});
	}
	return assumptions;
};

const resolveFilterReasons = (
	lore: LoreInfo,
	profile: HealthcareOperationsSessionProfile,
	overrides: HealthcareOperationsRequestOverrides
): RagExclusionReason[] => {
	const parsed = healthcareOperationsLoreStructuredMetadataSchema.safeParse(lore.structuredMetadata);
	if (!parsed.success) return ['invalid_structured_metadata'];

	const metadata = parsed.data;
	const requesterRole = overrides.requesterRole ?? profile.requesterRole;
	const urgency = overrides.urgency ?? profile.urgency;
	const workflowTopic = overrides.workflowTopic ?? detectWorkflowTopic(profile.workflowTopic ?? '');
	const reasons: RagExclusionReason[] = [];

	if (requesterRole && !metadata.allowedRequesterRoles.includes(requesterRole)) {
		reasons.push('requester_role_mismatch');
	}
	if (urgency && !metadata.urgencyLevels.includes(urgency)) {
		reasons.push('urgency_mismatch');
	}
	if (
		workflowTopic &&
		metadata.workflowTopic !== 'general_operations' &&
		metadata.workflowTopic !== workflowTopic
	) {
		reasons.push('workflow_topic_mismatch');
	}
	return reasons;
};

export const filterHealthcareOperationsLore = (
	lores: readonly LoreInfo[],
	profile: HealthcareOperationsSessionProfile,
	currentMessage: string
): HealthcareOperationsFilterResult => {
	const requestOverrides = analyzeHealthcareOperationsRequestOverrides(currentMessage);
	const decisions = lores.map((lore): RagStructuredFilterDecision => {
		const reasons = resolveFilterReasons(lore, profile, requestOverrides);
		return {
			sourceId: lore.loreId,
			label: lore.title || lore.generatedTitle || 'Healthcare Operations Lore',
			decision: reasons.length === 0 ? 'eligible' : 'excluded',
			reasons,
		};
	});
	const eligibleIds = new Set(
		decisions.filter(({ decision }) => decision === 'eligible').map(({ sourceId }) => sourceId)
	);
	return {
		eligibleLore: lores.filter(({ loreId }) => eligibleIds.has(loreId)),
		decisions,
		assumptions: buildAssumptions(requestOverrides),
		requestOverrides,
	};
};
