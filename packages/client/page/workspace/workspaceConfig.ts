import type {
	AssistantDomain,
	DomainSessionProfile,
	ProfileCdo,
	RagEvidenceDto,
	SessionInfo,
} from '@rag-advisor-demo/shared/domain';

export const DEMO_CHARACTER_IDS: Record<AssistantDomain, string> = {
	finance: 'finance-assistant_demo',
	healthcare_operations: 'healthcare-operations-assistant_demo',
};

export type WorkspaceDomainConfig = {
	domain: AssistantDomain;
	eyebrow: string;
	title: string;
	shortTitle: string;
	description: string;
	accent: string;
	softAccent: string;
	suggestedPrompts: string[];
};

export const WORKSPACE_DOMAINS: Record<AssistantDomain, WorkspaceDomainConfig> = {
	finance: {
		domain: 'finance',
		eyebrow: 'Financial product guidance',
		title: 'Compare fictional financial products with transparent evidence.',
		shortTitle: 'Finance',
		description:
			'Explore suitability, liquidity, risk, and time horizon using a fully fictional product catalog.',
		accent: '#f5a524',
		softAccent: '#fff0c7',
		suggestedPrompts: [
			'Compare the available products for a three-year goal.',
			'Which options preserve access to my money?',
			'Show the evidence behind a moderate-risk comparison.',
		],
	},
	healthcare_operations: {
		domain: 'healthcare_operations',
		eyebrow: 'Healthcare operations guidance',
		title: 'Navigate fictional administrative workflows with role-aware guidance.',
		shortTitle: 'Healthcare ops',
		description:
			'Review operational procedures for scheduling, records, billing, discharge, and system access.',
		accent: '#34c6b3',
		softAccent: '#c8f4ed',
		suggestedPrompts: [
			'Explain the billing inquiry workflow for patient support.',
			'What is the time-sensitive record-copy process?',
			'Outline the admission and discharge administration steps.',
		],
	},
};

export type FinanceProfileDraft = {
	investmentGoal: string;
	investmentHorizonMonths: string;
	liquidityNeed: '' | 'low' | 'medium' | 'high';
	riskPreference: '' | 'conservative' | 'moderate' | 'growth';
	constraints: string;
};

export type HealthcareProfileDraft = {
	workflowTopic: string;
	requesterRole: '' | 'nurse' | 'doctor' | 'admin_staff' | 'patient_support';
	urgency: '' | 'routine' | 'time_sensitive';
	constraints: string;
};

export const EMPTY_FINANCE_PROFILE: FinanceProfileDraft = {
	investmentGoal: '',
	investmentHorizonMonths: '',
	liquidityNeed: '',
	riskPreference: '',
	constraints: '',
};

export const EMPTY_HEALTHCARE_PROFILE: HealthcareProfileDraft = {
	workflowTopic: '',
	requesterRole: '',
	urgency: '',
	constraints: '',
};

export const buildDefaultFinanceReportRequest = (
	profile: DomainSessionProfile | undefined
): string => {
	if (profile?.domain !== 'finance') {
		return 'Compare the eligible fictional finance products for this session profile. Explain material risks and cite the supporting evidence.';
	}

	const details = [
		profile.riskPreference && `${profile.riskPreference}-risk preference`,
		profile.investmentHorizonMonths && `${profile.investmentHorizonMonths}-month horizon`,
		profile.liquidityNeed && `${profile.liquidityNeed} liquidity need`,
	].filter(Boolean);
	const profileSummary = details.length ? ` with a ${details.join(', a ')}` : '';
	return `Compare the eligible fictional finance products for this session profile${profileSummary}. Explain material risks and cite the supporting evidence.`;
};

const splitConstraints = (value: string): string[] =>
	value
		.split(/\r?\n|,/)
		.map((item) => item.trim())
		.filter(Boolean);

export const buildFinanceDomainProfile = (draft: FinanceProfileDraft): DomainSessionProfile => ({
	domain: 'finance',
	...(draft.investmentGoal.trim() && { investmentGoal: draft.investmentGoal.trim() }),
	...(draft.investmentHorizonMonths.trim() && {
		investmentHorizonMonths: Number(draft.investmentHorizonMonths),
	}),
	...(draft.liquidityNeed && { liquidityNeed: draft.liquidityNeed }),
	...(draft.riskPreference && { riskPreference: draft.riskPreference }),
	constraints: splitConstraints(draft.constraints),
});

export const buildHealthcareDomainProfile = (
	draft: HealthcareProfileDraft
): DomainSessionProfile => ({
	domain: 'healthcare_operations',
	...(draft.workflowTopic.trim() && { workflowTopic: draft.workflowTopic.trim() }),
	...(draft.requesterRole && { requesterRole: draft.requesterRole }),
	...(draft.urgency && { urgency: draft.urgency }),
	constraints: splitConstraints(draft.constraints),
});

export const buildProfileCdo = ({
	userId,
	sessionId,
	domainProfile,
}: {
	userId: string;
	sessionId: string;
	domainProfile: DomainSessionProfile;
}): ProfileCdo => ({
	userId,
	sessionId,
	name: `${domainProfile.domain}-workspace-user`,
	showName: 'You',
	gender: 'nocomment',
	title:
		domainProfile.domain === 'finance'
			? 'Finance exploration profile'
			: 'Healthcare operations profile',
	description: 'Fictional demo session profile. No real personal or organizational data.',
	domainProfile,
});

export const getSessionDomain = (session: SessionInfo): AssistantDomain | undefined => {
	const match = Object.entries(DEMO_CHARACTER_IDS).find(
		([, characterId]) => characterId === session.characterId
	);
	return match?.[0] as AssistantDomain | undefined;
};

export const summarizeDomainProfile = (
	profile: DomainSessionProfile | undefined
): Array<{ label: string; value: string; missing?: boolean }> => {
	if (!profile) return [];
	if (profile.domain === 'finance') {
		return [
			{
				label: 'Goal',
				value: profile.investmentGoal || 'Not provided',
				missing: !profile.investmentGoal,
			},
			{
				label: 'Horizon',
				value: profile.investmentHorizonMonths
					? `${profile.investmentHorizonMonths} months`
					: 'Not provided',
				missing: !profile.investmentHorizonMonths,
			},
			{
				label: 'Liquidity',
				value: profile.liquidityNeed?.replace('_', ' ') || 'Not provided',
				missing: !profile.liquidityNeed,
			},
			{
				label: 'Risk preference',
				value: profile.riskPreference || 'Not provided',
				missing: !profile.riskPreference,
			},
		];
	}
	return [
		{
			label: 'Workflow',
			value: profile.workflowTopic || 'Not provided',
			missing: !profile.workflowTopic,
		},
		{
			label: 'Requester role',
			value: profile.requesterRole?.replaceAll('_', ' ') || 'Not provided',
			missing: !profile.requesterRole,
		},
		{
			label: 'Urgency',
			value: profile.urgency?.replaceAll('_', ' ') || 'Not provided',
			missing: !profile.urgency,
		},
	];
};

export const countEvidenceKinds = (
	evidence: RagEvidenceDto | undefined
): Array<{ label: string; count: number }> => {
	if (!evidence) return [];
	const labels: Record<string, string> = {
		character_lore: 'Official domain lore',
		session_document: 'Session documents',
		chat_memory: 'Conversation memory',
	};
	const counts = new Map<string, number>();
	for (const item of evidence.items) {
		counts.set(item.sourceKind, (counts.get(item.sourceKind) ?? 0) + 1);
	}
	return Array.from(counts, ([kind, count]) => ({ label: labels[kind] ?? kind, count }));
};
