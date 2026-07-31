import type {
	FinancialSessionProfile,
	LoreInfo,
	RagContextAssumption,
	RagExclusionReason,
	RagStructuredFilterDecision,
} from '@rag-advisor-demo/shared/domain';
import { financeLoreStructuredMetadataSchema } from '@rag-advisor-demo/shared/domain';

import { financeCatalogStore } from '../store/financeCatalogStore.js';

export interface FinanceRequestOverrides {
	investmentHorizonMonths?: number;
	liquidityNeed?: FinancialSessionProfile['liquidityNeed'];
	riskPreference?: FinancialSessionProfile['riskPreference'];
}

export interface FinanceProductFilterResult {
	eligibleLore: LoreInfo[];
	decisions: RagStructuredFilterDecision[];
	assumptions: RagContextAssumption[];
	requestOverrides: FinanceRequestOverrides;
}

const RISK_LEVELS = { low: 0, medium: 1, high: 2 } as const;
const RISK_PREFERENCES = { conservative: 0, moderate: 1, growth: 2 } as const;
const LIQUIDITY_LEVELS = { low: 0, medium: 1, high: 2 } as const;

const parseNumber = (value: string): number | undefined => {
	const parsed = Number(value);
	return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
};

export const analyzeFinanceRequestOverrides = (message: string): FinanceRequestOverrides => {
	const normalized = message.toLowerCase();
	const monthMatch = normalized.match(/\b(\d{1,3})\s*(?:months?|mos?)\b|(\d{1,3})\s*개월/);
	const yearMatch = normalized.match(/\b(\d{1,2})\s*(?:years?|yrs?)\b|(\d{1,2})\s*년/);
	const monthValue = parseNumber(monthMatch?.[1] ?? monthMatch?.[2] ?? '');
	const yearValue = parseNumber(yearMatch?.[1] ?? yearMatch?.[2] ?? '');
	const hasPersonalHorizonIntent =
		/\b(?:assume|assuming|if|for this answer|my (?:investment )?horizon|i (?:need|plan|expect|intend|can|will))\b/.test(
			normalized
		) ||
		/(가정|이번(?:에는| 돈)|투자\s*기간(?:은|을|이)|제가? .*?(?:필요|계획|예정)|이번 답변)/.test(
			normalized
		) ||
		/(?:\d{1,3}\s*(?:개월|년)).*?(?:투자|모을|쓸|써야|사용|필요|계획|예정|조건)/.test(normalized);
	const investmentHorizonMonths = hasPersonalHorizonIntent
		? (monthValue ?? (yearValue ? yearValue * 12 : undefined))
		: undefined;

	let liquidityNeed: FinanceRequestOverrides['liquidityNeed'];
	if (
		/\b(?:i need high liquidity|assume high liquidity|my liquidity need is high|need (?:quick|immediate) access|withdraw anytime|emergency funds?)\b/.test(
			normalized
		) ||
		/(높은 유동성(?:이)? 필요|유동성을? 높게|즉시 인출|언제든(?:지)? 인출|비상\s*자금|중도에 .*?(?:빼|인출))/.test(
			normalized
		)
	) {
		liquidityNeed = 'high';
	} else if (
		/\b(?:i need medium liquidity|assume medium liquidity|my liquidity need is medium)\b/.test(
			normalized
		) ||
		/중간 유동성(?:이)? 필요/.test(normalized)
	) {
		liquidityNeed = 'medium';
	} else if (/\blow liquidity need\b/.test(normalized) || /낮은 유동성 필요/.test(normalized)) {
		liquidityNeed = 'low';
	}

	let riskPreference: FinanceRequestOverrides['riskPreference'];
	if (
		/\b(?:i am conservative|assume (?:i am )?conservative|my (?:risk )?preference is conservative|low[- ]risk preference|i (?:want to )?avoid (?:most )?risk)\b/.test(
			normalized
		) ||
		/(보수적(?:인 성향|으로 가정)|안정형|안정성을? (?:우선|중시)|저위험 선호|위험 회피|원금 손실(?:을|은)? .*?(?:피하고|피하|원하지 않|감당하지 못))/.test(
			normalized
		)
	) {
		riskPreference = 'conservative';
	} else if (
		/\bmoderate risk preference\b/.test(normalized) ||
		/(중위험 선호|원금 손실(?:은|을)? .*?(?:조금|어느 정도) .*?감수)/.test(normalized)
	) {
		riskPreference = 'moderate';
	} else if (
		/\b(?:growth risk preference|high[- ]risk preference)\b/.test(normalized) ||
		/(성장형 선호|고위험 선호|공격적(?:인|으로)? 투자)/.test(normalized)
	) {
		riskPreference = 'growth';
	}

	return { investmentHorizonMonths, liquidityNeed, riskPreference };
};

const buildAssumptions = (overrides: FinanceRequestOverrides): RagContextAssumption[] => {
	const assumptions: RagContextAssumption[] = [];
	if (overrides.investmentHorizonMonths !== undefined) {
		assumptions.push({
			source: 'current_request',
			description: `Temporary investment horizon: ${overrides.investmentHorizonMonths} months.`,
		});
	}
	if (overrides.liquidityNeed) {
		assumptions.push({
			source: 'current_request',
			description: `Temporary liquidity need: ${overrides.liquidityNeed}.`,
		});
	}
	if (overrides.riskPreference) {
		assumptions.push({
			source: 'current_request',
			description: `Temporary risk preference: ${overrides.riskPreference}.`,
		});
	}
	return assumptions;
};

const getProductExclusionReasons = (
	metadata: {
		riskLevel: 'low' | 'medium' | 'high';
		minimumHorizonMonths: number;
		liquidityLevel: 'low' | 'medium' | 'high';
	},
	profile: FinancialSessionProfile,
	overrides: FinanceRequestOverrides
): RagExclusionReason[] => {
	const reasons: RagExclusionReason[] = [];
	const horizon = overrides.investmentHorizonMonths ?? profile.investmentHorizonMonths;
	const liquidity = overrides.liquidityNeed ?? profile.liquidityNeed;
	const risk = overrides.riskPreference ?? profile.riskPreference;

	if (horizon !== undefined && horizon < metadata.minimumHorizonMonths) {
		reasons.push('horizon_mismatch');
	}
	if (liquidity && LIQUIDITY_LEVELS[metadata.liquidityLevel] < LIQUIDITY_LEVELS[liquidity]) {
		reasons.push('liquidity_mismatch');
	}
	if (risk && RISK_LEVELS[metadata.riskLevel] > RISK_PREFERENCES[risk]) {
		reasons.push('risk_mismatch');
	}
	return reasons;
};

const resolveFilterReasons = (
	lore: LoreInfo,
	profile: FinancialSessionProfile,
	overrides: FinanceRequestOverrides
): RagExclusionReason[] => {
	const parsed = financeLoreStructuredMetadataSchema.safeParse(lore.structuredMetadata);
	if (!parsed.success) return ['invalid_structured_metadata'];
	if (parsed.data.knowledgeType === 'education') return [];

	if (parsed.data.knowledgeType === 'product') {
		return getProductExclusionReasons(
			{
				riskLevel: parsed.data.riskLevel!,
				minimumHorizonMonths: parsed.data.minimumHorizonMonths!,
				liquidityLevel: parsed.data.liquidityLevel!,
			},
			profile,
			overrides
		);
	}

	const product = financeCatalogStore.getProduct(parsed.data.productFixtureId!);
	const productMetadata = financeLoreStructuredMetadataSchema.safeParse(
		product?.lore.structuredMetadata
	);
	if (!product || !productMetadata.success || productMetadata.data.knowledgeType !== 'product') {
		return ['invalid_structured_metadata'];
	}
	return getProductExclusionReasons(
		{
			riskLevel: productMetadata.data.riskLevel!,
			minimumHorizonMonths: productMetadata.data.minimumHorizonMonths!,
			liquidityLevel: productMetadata.data.liquidityLevel!,
		},
		profile,
		overrides
	);
};

export const filterFinanceLore = (
	lores: readonly LoreInfo[],
	profile: FinancialSessionProfile,
	currentMessage: string
): FinanceProductFilterResult => {
	const requestOverrides = analyzeFinanceRequestOverrides(currentMessage);
	const decisions = lores.map((lore): RagStructuredFilterDecision => {
		const reasons = resolveFilterReasons(lore, profile, requestOverrides);
		return {
			sourceId: lore.loreId,
			label: lore.title || lore.generatedTitle || 'Finance Lore',
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
