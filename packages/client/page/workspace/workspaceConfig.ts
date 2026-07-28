import type {
	AssistantDomain,
	DomainSessionProfile,
	ProfileCdo,
	RagEvidenceDto,
	SessionInfo,
} from '@rag-advisor-demo/shared/domain';
import type { LangCode } from '@rag-advisor-demo/shared/config';

export const DEMO_CHARACTER_IDS: Record<AssistantDomain, string> = {
	finance: 'finance-assistant_demo',
	healthcare_operations: 'healthcare-operations-assistant_demo',
};

export type WorkspaceDomainConfig = {
	domain: AssistantDomain;
	eyebrow: string;
	title: string;
	shortTitle: string;
	sessionTitle: string;
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
		sessionTitle: 'Finance guide',
		description:
			'Explore suitability, liquidity, risk, and time horizon using a fully fictional product catalog.',
		accent: '#f5a524',
		softAccent: '#fff0c7',
		suggestedPrompts: [
			'I can invest 500,000 won each month. What might suit me?',
			'I plan to save for about three years. Would a deposit or fund suit me better?',
			'I have never invested before. Where should I start?',
			'I need an emergency fund but also want to invest. How could I split the money?',
			'How much of a deposit can be protected?',
		],
	},
	healthcare_operations: {
		domain: 'healthcare_operations',
		eyebrow: 'Healthcare operations guidance',
		title: 'Navigate fictional administrative workflows with role-aware guidance.',
		shortTitle: 'Healthcare ops',
		sessionTitle: 'Healthcare operations guide',
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

const DEFAULT_SESSION_TITLES: Record<AssistantDomain, readonly string[]> = {
	finance: ['Finance product exploration', 'Finance guidance', 'Finance guide'],
	healthcare_operations: [
		'Healthcare operations workflow',
		'Healthcare operations guidance',
		'Healthcare operations guide',
	],
};

export const getSessionDisplayTitle = (
	title: string,
	domain: AssistantDomain,
	lang: LangCode
): string => {
	if (!title || DEFAULT_SESSION_TITLES[domain].includes(title)) {
		return lang === 'kor'
			? domain === 'finance'
				? '금융 상품 알아보기'
				: '의료 운영 절차 알아보기'
			: WORKSPACE_DOMAINS[domain].sessionTitle;
	}
	return title;
};

const isFinanceAnswerNotice = (paragraph: string): boolean => {
	const normalized = paragraph.replace(/\s+/g, ' ').trim();
	const hasDemoMarker = /(?:fictional|demo|가상|데모)/i.test(normalized);
	const hasAdviceNotice =
		/(?:not financial advice|not financial or legal advice|금융(?:\s*(?:·|또는)\s*법률)?\s*자문이\s*아닙니다)/i.test(
			normalized
		);
	return hasDemoMarker && hasAdviceNotice;
};

export const stripFinanceAnswerNotices = (value: string): string =>
	value
		.replace(/\r\n|\r/g, '\n')
		.split(/\n{2,}/)
		.filter((paragraph) => !isFinanceAnswerNotice(paragraph))
		.join('\n\n')
		.trim();

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
	profile: DomainSessionProfile | undefined,
	lang: LangCode = 'eng'
): string => {
	if (lang === 'kor') {
		return '현재 제 프로필에 맞는 상품을 최대 3개 비교해 주세요. 장점, 돈을 꺼내기 쉬운 정도, 원금 손실 위험과 예금자보호 여부를 근거와 함께 설명하고, 가장 적합한 상품 하나를 추천해 주세요.';
	}
	if (profile?.domain !== 'finance') {
		return 'Compare up to three suitable products for this session profile. Explain benefits, access to funds, principal-loss risk, and deposit protection with citations, then recommend the best-supported option.';
	}

	const details = [
		profile.riskPreference && `${profile.riskPreference}-risk preference`,
		profile.investmentHorizonMonths && `${profile.investmentHorizonMonths}-month horizon`,
		profile.liquidityNeed && `${profile.liquidityNeed} liquidity need`,
	].filter(Boolean);
	const profileSummary = details.length ? ` with a ${details.join(', a ')}` : '';
	return `Compare up to three suitable products for this session profile${profileSummary}. Explain benefits, access to funds, principal-loss risk, and deposit protection with citations, then recommend the best-supported option.`;
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
	profile: DomainSessionProfile | undefined,
	lang: LangCode = 'eng'
): Array<{ label: string; value: string; missing?: boolean }> => {
	if (!profile) return [];
	const korean = lang === 'kor';
	const missing = korean ? '입력되지 않음' : 'Not provided';
	const translateValue = (value: string | undefined): string => {
		if (!value) return missing;
		if (!korean) return value.replaceAll('_', ' ');
		return (
			(
				{
					low: '낮음',
					medium: '중간',
					high: '높음',
					conservative: '보수적',
					moderate: '중간',
					growth: '성장형',
					patient_support: '환자 지원',
					admin_staff: '행정 직원',
					nurse: '간호사',
					doctor: '의사',
					routine: '일반',
					time_sensitive: '시간 민감',
				} as Record<string, string>
			)[value] ?? value
		);
	};
	if (profile.domain === 'finance') {
		return [
			{
				label: korean ? '목표' : 'Goal',
				value: profile.investmentGoal || missing,
				missing: !profile.investmentGoal,
			},
			{
				label: korean ? '기간' : 'Horizon',
				value: profile.investmentHorizonMonths
					? `${profile.investmentHorizonMonths}${korean ? '개월' : ' months'}`
					: missing,
				missing: !profile.investmentHorizonMonths,
			},
			{
				label: korean ? '유동성' : 'Liquidity',
				value: translateValue(profile.liquidityNeed),
				missing: !profile.liquidityNeed,
			},
			{
				label: korean ? '위험 성향' : 'Risk preference',
				value: translateValue(profile.riskPreference),
				missing: !profile.riskPreference,
			},
		];
	}
	return [
		{
			label: korean ? '업무' : 'Workflow',
			value: profile.workflowTopic || missing,
			missing: !profile.workflowTopic,
		},
		{
			label: korean ? '요청자 역할' : 'Requester role',
			value: translateValue(profile.requesterRole),
			missing: !profile.requesterRole,
		},
		{
			label: korean ? '긴급도' : 'Urgency',
			value: translateValue(profile.urgency),
			missing: !profile.urgency,
		},
	];
};

export const countEvidenceKinds = (
	evidence: RagEvidenceDto | undefined,
	lang: LangCode = 'eng'
): Array<{ label: string; count: number }> => {
	if (!evidence) return [];
	const labels: Record<string, string> =
		lang === 'kor'
			? { character_lore: '공식 도메인 지식', session_document: '세션 문서', chat_memory: '대화 기억' }
			: {
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
