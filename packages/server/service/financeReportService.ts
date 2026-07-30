import { z } from 'zod';
import type { ChatCompletionMessageParam } from 'openai/resources/index.mjs';

import type { MemoryResponse } from '@rag-advisor-demo/shared/api';
import { RECENT_CHAT_TURN } from '@rag-advisor-demo/shared/config';
import {
	ApiError,
	type ChatTurn,
	type DocumentSourceRefs,
	type FinanceReportDraftCreate,
	type LoreInfo,
	type SessionInfo,
	financeLoreStructuredMetadataSchema,
} from '@rag-advisor-demo/shared/domain';
import { serializeChatEntries } from '@rag-advisor-demo/shared/util';

import { characterStore } from '../store/characterStore.js';
import { chatStore } from '../store/chatStore.js';
import { documentStore } from '../store/documentStore.js';
import { loreStore } from '../store/loreStore.js';
import { profileStore } from '../store/profileStore.js';
import { detectLanguage } from '../util/languageUtils.js';
import { buildDocumentSourceRefs } from './documentGenerationService.js';
import { llmService } from './llmService.js';
import { memoryEngine } from './memoryEngine.js';
import { modelCatalogService } from './modelCatalogService.js';
import { resolveRagContext, type ResolvedRagContext } from './ragContextService.js';

const financeReportMatchSchema = z
	.object({
		productFixtureId: z.string().trim().min(1).max(200),
		fitSummary: z.string().trim().min(1).max(2_000),
		advantages: z.array(z.string().trim().min(1).max(1_000)).min(1).max(8),
		disadvantages: z.array(z.string().trim().min(1).max(1_000)).min(1).max(8),
		riskWarnings: z.array(z.string().trim().min(1).max(1_000)).min(1).max(8),
		evidenceIds: z.array(z.string().trim().min(1).max(300)).min(1).max(12),
	})
	.strict();

const financeReportRecommendationSchema = z
	.object({
		recommendedProductFixtureId: z.string().trim().min(1).max(200).nullable(),
		conclusion: z.string().trim().min(1).max(2_000),
		reasons: z.array(z.string().trim().min(1).max(1_000)).min(1).max(6),
	})
	.strict();

export const financeReportOutputSchema = z
	.object({
		title: z.string().trim().min(1).max(300),
		summary: z.string().trim().min(1).max(4_000),
		recommendation: financeReportRecommendationSchema,
		productMatches: z.array(financeReportMatchSchema).max(3),
		generalRiskWarnings: z.array(z.string().trim().min(1).max(1_000)).min(1).max(12),
	})
	.strict();

export type FinanceReportOutput = z.infer<typeof financeReportOutputSchema>;

const FINANCE_REPORT_TURN_LIMIT = 12;

const escapeHtml = (value: string): string =>
	value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const getEligibleProducts = (context: ResolvedRagContext): Map<string, LoreInfo> =>
	new Map(
		context.memories.relevantLore
			.filter((lore) => {
				const parsed = financeLoreStructuredMetadataSchema.safeParse(lore.structuredMetadata);
				return parsed.success && parsed.data.knowledgeType === 'product' && lore.fixtureId;
			})
			.map((lore) => [lore.fixtureId!, lore])
	);

export const mergeFinanceReportLore = (
	retrievedLore: readonly LoreInfo[],
	characterLore: readonly LoreInfo[]
): LoreInfo[] => {
	const merged = new Map(retrievedLore.map((lore) => [lore.loreId, lore]));
	for (const lore of characterLore) {
		if (!merged.has(lore.loreId)) merged.set(lore.loreId, lore);
	}
	return [...merged.values()];
};

export const validateFinanceReportEvidence = (
	output: FinanceReportOutput,
	context: ResolvedRagContext
): FinanceReportOutput => {
	const allowedEvidenceIds = new Set(context.evidence.items.map(({ sourceId }) => sourceId));
	const eligibleProducts = getEligibleProducts(context);
	const seenProducts = new Set<string>();
	const recommendedProductFixtureId = output.recommendation.recommendedProductFixtureId;

	for (const match of output.productMatches) {
		const product = eligibleProducts.get(match.productFixtureId);
		if (!product) {
			throw new ApiError(
				422,
				`Finance report referenced ineligible product '${match.productFixtureId}'.`
			);
		}
		if (seenProducts.has(match.productFixtureId)) {
			throw new ApiError(422, `Finance report duplicated product '${match.productFixtureId}'.`);
		}
		seenProducts.add(match.productFixtureId);
		if (
			!match.evidenceIds.every((sourceId) => allowedEvidenceIds.has(sourceId)) ||
			!match.evidenceIds.includes(product.loreId)
		) {
			throw new ApiError(422, `Finance report used invalid evidence for '${match.productFixtureId}'.`);
		}
	}
	if (
		recommendedProductFixtureId !== null &&
		!output.productMatches.some(
			({ productFixtureId }) => productFixtureId === recommendedProductFixtureId
		)
	) {
		throw new ApiError(
			422,
			`Finance report recommended unlisted product '${recommendedProductFixtureId}'.`
		);
	}
	return output;
};

const renderList = (values: readonly string[], emptyLabel: string): string =>
	values.length > 0 ? values.map((value) => `- ${escapeHtml(value)}`).join('\n') : `- ${emptyLabel}`;

const FINANCE_REPORT_COPY = {
	eng: {
		disclaimer:
			'Demo notice: This report uses demonstration products and scenarios for a technical RAG showcase. Attributed public regulatory sources may be real. It is educational information, not financial advice or legal advice. No return, principal, income, or outcome is guaranteed.',
		summary: 'Summary',
		finalRecommendation: 'Final recommendation',
		request: 'Request used for this report',
		conversationTurns: 'Conversation turns used',
		turn: 'Turn',
		userQuestion: 'User message',
		noConversationTurns: 'No preceding conversation turn was used.',
		carriedContext: 'Carried forward from the conversation',
		amount: 'Amount',
		why: 'Why this option',
		noSingleRecommendation: 'No single supported recommendation',
		profileFields: 'Session profile fields used',
		assumptions: 'New assumptions added for this request',
		missingInformation: 'Missing information',
		productMatches: 'Product matches',
		fitSummary: 'Fit for this request',
		advantages: 'Advantages',
		disadvantages: 'Trade-offs',
		generalWarnings: 'General risk warnings',
		riskWarnings: 'Risk warnings',
		evidence: 'Evidence',
		noProduct: 'No product match was supported by the eligible evidence.',
		noWarning: 'No model-provided warning.',
		noEvidence: 'No evidence ID.',
		noProfileFields: 'No profile fields beyond the domain.',
		noAssumptions: 'No new assumptions were added for this request.',
		noMissingInformation: 'No required profile information was identified as missing.',
		noGeneralWarning: 'No model-provided general warning.',
	},
	kor: {
		disclaimer:
			'안내: 이 보고서는 기술 RAG 시연을 위한 상품과 시나리오를 사용합니다. 출처가 표시된 공공 규제 자료는 실제 자료일 수 있습니다. 금융·법률 자문이 아닌 교육용 정보이며 수익, 원금, 소득 또는 결과를 보장하지 않습니다.',
		summary: '요약',
		finalRecommendation: '최종 추천',
		request: '이 리포트에 사용한 요청',
		conversationTurns: '사용한 대화 턴',
		turn: '대화',
		userQuestion: '사용자 질문',
		noConversationTurns: '사용한 앞선 대화 턴이 없습니다.',
		carriedContext: '앞선 대화에서 이어받은 정보',
		amount: '금액',
		why: '이 상품을 추천하는 이유',
		noSingleRecommendation: '한 상품을 추천하기 어려움',
		profileFields: '사용한 세션 프로필',
		assumptions: '이번 요청에서 새로 추가한 가정',
		missingInformation: '부족한 정보',
		productMatches: '상품 비교',
		fitSummary: '이번 요청과의 적합성',
		advantages: '장점',
		disadvantages: '단점과 고려할 점',
		generalWarnings: '공통 위험 안내',
		riskWarnings: '주의할 위험',
		evidence: '사용한 근거',
		noProduct: '사용 가능한 근거로 뒷받침되는 상품 후보가 없습니다.',
		noWarning: '별도로 생성된 위험 안내가 없습니다.',
		noEvidence: '표시할 근거 ID가 없습니다.',
		noProfileFields: '도메인 외에 사용한 프로필 항목이 없습니다.',
		noAssumptions: '이번 요청에서 새로 추가한 가정이 없습니다.',
		noMissingInformation: '필수 프로필에서 부족한 정보가 확인되지 않았습니다.',
		noGeneralWarning: '별도로 생성된 공통 위험 안내가 없습니다.',
	},
} as const;

const getReportProductTitle = (title: string): string => title.replace(/^DEMO\s*[—-]\s*/i, '');

const replaceCanonicalFinanceIdentifiers = (value: string, context: ResolvedRagContext): string => {
	const protectedCitations: string[] = [];
	let result = value.replace(/\[[^\]\r\n]*_demo-lore[^\]\r\n]*\]/g, (citation) => {
		const token = `__REPORT_CITATION_${protectedCitations.length}__`;
		protectedCitations.push(citation);
		return token;
	});
	const labels = new Map<string, string>();
	for (const lore of context.memories.relevantLore) {
		const title = getReportProductTitle(lore.title);
		labels.set(lore.loreId, title);
		if (lore.fixtureId) labels.set(lore.fixtureId, title);
	}
	for (const [identifier, title] of [...labels.entries()].sort(
		(left, right) => right[0].length - left[0].length
	)) {
		result = result.replaceAll(identifier, title);
	}
	return result.replace(
		/__REPORT_CITATION_(\d+)__/g,
		(_, index: string) => protectedCitations[Number(index)] ?? ''
	);
};

const renderNarrative = (value: string, context: ResolvedRagContext): string =>
	escapeHtml(replaceCanonicalFinanceIdentifiers(value, context));

const renderNarrativeList = (
	values: readonly string[],
	emptyLabel: string,
	context: ResolvedRagContext
): string =>
	renderList(
		values.map((value) => replaceCanonicalFinanceIdentifiers(value, context)),
		emptyLabel
	);

const PROFILE_FIELD_LABELS = {
	eng: {
		domain: 'Domain',
		investmentGoal: 'Investment goal',
		investmentHorizonMonths: 'Investment horizon',
		liquidityNeed: 'Liquidity need',
		riskPreference: 'Risk preference',
		constraints: 'Additional constraints',
	},
	kor: {
		domain: '분야',
		investmentGoal: '투자 목표',
		investmentHorizonMonths: '투자 기간',
		liquidityNeed: '자금 사용의 유연성',
		riskPreference: '위험 감수 성향',
		constraints: '추가 조건',
	},
} as const;

const PROFILE_VALUE_LABELS = {
	eng: {
		finance: 'Finance',
		high: 'High',
		medium: 'Medium',
		low: 'Low',
		conservative: 'Conservative',
		moderate: 'Moderate',
		growth: 'Growth',
	},
	kor: {
		finance: '금융',
		high: '높음',
		medium: '중간',
		low: '낮음',
		conservative: '안정형',
		moderate: '중립형',
		growth: '성장형',
	},
} as const;

const getProfileFieldLabel = (field: string, language: 'eng' | 'kor'): string =>
	(PROFILE_FIELD_LABELS[language] as Record<string, string>)[field] ?? field;

const localizeAssumption = (description: string, language: 'eng' | 'kor'): string => {
	if (language === 'eng') return description;
	const horizon = description.match(/^Temporary investment horizon: (\d+) months\.$/);
	if (horizon) return `이번 요청에서는 투자 기간을 ${horizon[1]}개월로 가정했습니다.`;
	const liquidity = description.match(/^Temporary liquidity need: (high|medium|low)\.$/);
	if (liquidity) {
		const value = PROFILE_VALUE_LABELS.kor[liquidity[1] as 'high' | 'medium' | 'low'];
		return `이번 요청에서는 필요한 때 돈을 꺼내기 쉬운 정도를 ${value}으로 가정했습니다.`;
	}
	const risk = description.match(/^Temporary risk preference: (conservative|moderate|growth)\.$/);
	if (risk) {
		const value = PROFILE_VALUE_LABELS.kor[risk[1] as 'conservative' | 'moderate' | 'growth'];
		return `이번 요청에서는 위험 감수 성향을 ${value}으로 가정했습니다.`;
	}
	return description;
};

const renderProfileFields = (
	context: ResolvedRagContext,
	language: 'eng' | 'kor',
	emptyLabel: string
): string => {
	const profile = context.sessionProfile as unknown as Record<string, unknown>;
	const valueLabels = PROFILE_VALUE_LABELS[language] as Record<string, string>;
	const values = context.evidence.profileFieldsUsed.map((field) => {
		const rawValue = profile[field];
		const label = getProfileFieldLabel(field, language);
		const formattedValue =
			field === 'investmentHorizonMonths' && typeof rawValue === 'number'
				? language === 'kor'
					? `${rawValue}개월`
					: `${rawValue} months`
				: Array.isArray(rawValue)
					? rawValue.join(', ')
					: (valueLabels[String(rawValue)] ?? String(rawValue ?? ''));
		return formattedValue ? `${label}: ${formattedValue}` : label;
	});
	return renderList(values, emptyLabel);
};

interface FinanceReportConversationContext {
	turns: Array<{ turnId: string; sequence: number; userText: string; assistantText: string }>;
	carriedFacts: Array<{ kind: 'amount'; value: string }>;
}

const MONEY_REFERENCE_PATTERN = /(?:이|그|해당)\s*(?:돈|자금)|this money|that money|these funds/i;
const MONEY_AMOUNT_PATTERN = /(?:₩\s*)?(?:\d{1,3}(?:,\d{3})+|\d+)\s*(?:억|만|천)?\s*원/g;

const buildFinanceReportConversationContext = (
	context: ResolvedRagContext,
	sourceTurns: readonly ChatTurn[] = [
		...context.memories.longTermHistory,
		...context.memories.shortTermHistory,
	]
): FinanceReportConversationContext => {
	const turns = new Map(sourceTurns.map((turn) => [turn.chatTurnId, turn]));
	const orderedTurns = [...turns.values()].sort((left, right) => left.sequence - right.sequence);
	const carriedFacts: FinanceReportConversationContext['carriedFacts'] = [];

	if (MONEY_REFERENCE_PATTERN.test(context.currentMessage)) {
		for (const turn of [...orderedTurns].reverse()) {
			const userText = serializeChatEntries(turn.request.entries, 'asterisk-actions');
			const amounts = [...userText.matchAll(MONEY_AMOUNT_PATTERN)];
			const amount = amounts.at(-1)?.[0]?.replaceAll(/\s/g, '');
			if (!amount) continue;
			carriedFacts.push({ kind: 'amount', value: amount });
			break;
		}
	}

	return {
		turns: orderedTurns
			.slice(-FINANCE_REPORT_TURN_LIMIT)
			.map((turn) => ({
				turnId: turn.chatTurnId,
				sequence: turn.sequence,
				userText: serializeChatEntries(turn.request.entries, 'asterisk-actions'),
				assistantText: serializeChatEntries(turn.response.entries, 'asterisk-actions'),
			})),
		carriedFacts,
	};
};

export const buildFinanceReportSourceRefs = (
	memories: MemoryResponse,
	chatTurnIds: readonly string[]
): DocumentSourceRefs => ({
	...buildDocumentSourceRefs(memories),
	chatTurnIds: [...new Set(chatTurnIds)],
});

export const renderFinanceReportMarkdown = (
	output: FinanceReportOutput,
	context: ResolvedRagContext,
	conversationContext = buildFinanceReportConversationContext(context)
): string => {
	const language = context.memories.langCode === 'kor' ? 'kor' : 'eng';
	const text = FINANCE_REPORT_COPY[language];
	const eligibleProducts = getEligibleProducts(context);
	const recommendedProduct = output.recommendation.recommendedProductFixtureId
		? eligibleProducts.get(output.recommendation.recommendedProductFixtureId)
		: undefined;
	const recommendationTitle = recommendedProduct
		? getReportProductTitle(recommendedProduct.title)
		: text.noSingleRecommendation;
	const productSections = output.productMatches.length
		? output.productMatches
				.map((match) => {
					const product = eligibleProducts.get(match.productFixtureId)!;
					return `### ${escapeHtml(getReportProductTitle(product.title))}

${text.fitSummary}: ${renderNarrative(match.fitSummary, context)}

${text.advantages}:
${renderNarrativeList(match.advantages, text.noWarning, context)}

${text.disadvantages}:
${renderNarrativeList(match.disadvantages, text.noWarning, context)}

${text.riskWarnings}:
${renderNarrativeList(match.riskWarnings, text.noWarning, context)}

${text.evidence}:
${renderList(
	match.evidenceIds.map((sourceId) => `[${sourceId}]`),
	text.noEvidence
)}`;
				})
				.join('\n\n')
		: text.noProduct;

	return `# ${renderNarrative(output.title, context)}

> ${text.disclaimer}

## ${text.request}

${escapeHtml(context.currentMessage)}

## ${text.conversationTurns}

${renderList(
	conversationContext.turns.map(
		({ sequence, userText }) =>
			`${text.turn} ${sequence} — ${text.userQuestion}: ${userText.replace(/\s+/g, ' ').trim()}`
	),
	text.noConversationTurns
)}

${
	conversationContext.carriedFacts.length
		? `${text.carriedContext}:
${renderList(
	conversationContext.carriedFacts.map(({ kind, value }) =>
		kind === 'amount' ? `${text.amount}: ${value}` : value
	),
	''
)}`
		: ''
}

## ${text.finalRecommendation}

### ${escapeHtml(recommendationTitle)}

${renderNarrative(output.recommendation.conclusion, context)}

${text.why}:
${renderNarrativeList(output.recommendation.reasons, text.noWarning, context)}

## ${text.summary}

${renderNarrative(output.summary, context)}

## ${text.profileFields}

${renderProfileFields(context, language, text.noProfileFields)}

## ${text.assumptions}

${renderList(
	context.evidence.assumptions.map(({ description }) => localizeAssumption(description, language)),
	text.noAssumptions
)}

## ${text.missingInformation}

${renderList(
	context.evidence.missingInformation.map(({ field }) => getProfileFieldLabel(field, language)),
	text.noMissingInformation
)}

## ${text.productMatches}

${productSections}

## ${text.generalWarnings}

${renderNarrativeList(output.generalRiskWarnings, text.noGeneralWarning, context)}
`;
};

const buildFinanceEvidencePayload = (
	context: ResolvedRagContext,
	conversationContext: FinanceReportConversationContext
) => ({
	sessionProfile: context.sessionProfile,
	currentRequest: context.currentMessage,
	conversationContext: conversationContext.turns,
	carriedConversationFacts: conversationContext.carriedFacts,
	temporaryAssumptions: context.evidence.assumptions,
	missingInformation: context.evidence.missingInformation,
	eligibleLore: context.memories.relevantLore.map((lore) => ({
		sourceId: lore.loreId,
		fixtureId: lore.fixtureId,
		title: lore.title,
		summary: lore.summary,
		body: lore.content,
		structuredMetadata: lore.structuredMetadata,
	})),
	retrievedChatMemoryIds: context.memories.longTermHistory.map(({ chatTurnId }) => chatTurnId),
	sessionDocuments: (context.memories.relevantDocuments ?? []).map((document) => ({
		sourceId: document.documentId,
		title: document.title,
		body: document.body,
		origin: document.origin,
	})),
	structuredFilterDecisions: context.evidence.structuredFilterDecisions,
	allowedEvidenceIds: context.evidence.items.map(({ sourceId }) => sourceId),
});

export const buildFinanceReportMessages = (
	context: ResolvedRagContext,
	conversationContext = buildFinanceReportConversationContext(context)
): ChatCompletionMessageParam[] => {
	const outputLanguage = context.memories.langCode === 'kor' ? 'Korean' : 'English';
	return [
		{
			role: 'system',
			content: `Create a decision-ready finance result report for a fictional technical RAG demonstration.
Write every model-generated field in ${outputLanguage}. Do not mix languages except for proper nouns or stable source IDs.
Use only the supplied eligible evidence for product-specific claims.
Return at most three eligible fictional products. Each product must use its exact fixtureId and must cite its product Lore source ID plus any supporting evidence IDs.
For every compared product, state its fit for this request, concrete advantages, concrete disadvantages, and material risk warnings.
In every human-facing text field, use each product or Lore title instead of its fixtureId or source ID. Stable IDs belong only in the dedicated productFixtureId, recommendedProductFixtureId, and evidenceIds fields.
When the request asks which option is better or requests a recommendation, select exactly one compared product as recommendedProductFixtureId when the eligible evidence supports doing so. Give a direct conclusion and concise reasons that distinguish it from the alternatives.
Use null for recommendedProductFixtureId only when the evidence or missing user information genuinely prevents a supported choice, and explain that limitation in the conclusion.
Put every Lore source ID in its own square brackets when mentioning evidence. Never combine multiple source IDs inside one pair of brackets.
Do not include an excluded product. Do not invent products, rates, fees, guarantees, issuers, tax treatment, or evidence IDs.
Use conditional educational wording. Explain material risk, liquidity, horizon, assumptions, and missing information.
conversationContext is the authoritative, fixed snapshot of preceding persisted turns selected for this report. Resolve references in currentRequest such as "this money", "that plan", "the period mentioned earlier", "이 돈", "그 계획", or "앞서 말한 기간" from those complete turns. Treat userText as user-supplied context, but do not treat assistantText as a new user fact. Carry forward clearly stated amounts, purposes, periods, preferences, and constraints when referenced by the current request.
carriedConversationFacts is only a deterministic validation fallback for facts already present in conversationContext, not the primary interpretation mechanism. Explicitly state every carriedConversationFacts value in the report title, summary, or recommendation conclusion without changing it.
Do not prefix product names, terms, rates, or periods with "fictional", "demo", "가상", or "데모"; the report disclaimer supplies that context.
Never claim to be a licensed adviser, execute transactions, guarantee outcomes, or provide real financial advice.
The server adds the fixed demo disclaimer and authoritative assumptions/missing-information sections.`,
		},
		{
			role: 'user',
			content: `Build the report from this server-resolved context:\n${JSON.stringify(
				buildFinanceEvidencePayload(context, conversationContext),
				null,
				2
			)}`,
		},
	];
};

export const financeReportService = {
	generateDraft: async (input: FinanceReportDraftCreate, userId: string, session: SessionInfo) => {
		const [characterResponse, chatResponse, profileResponse, aiModelInfo, characterLoreResponse] =
			await Promise.all([
				characterStore.getCharacter(session.characterId),
				chatStore.getAllChatTurns(session.sessionId),
				profileStore.getProfileBySessionId(session.sessionId),
				modelCatalogService.resolveAiModelInfo(input.modelName),
				loreStore.getLoresByCharacter(session.characterId, userId),
			]);
		const character = characterResponse.characterInfo;
		if (character.domain !== 'finance') {
			throw new ApiError(400, 'Finance reports require the Finance Character.');
		}
		const reportTurns = [...chatResponse.chatTurns].sort(
			(left, right) => left.sequence - right.sequence
		);
		const recentTurns = reportTurns.slice(-RECENT_CHAT_TURN);
		const retrievedMemories = await memoryEngine.recallRelevantMemories(
			session.sessionId,
			input.requestText,
			userId,
			recentTurns,
			detectLanguage(input.requestText),
			aiModelInfo,
			{
				userShowName: profileResponse.profileInfo.showName,
				characterShowName: character.showName,
				turnId: `${session.sessionId}:finance-report`,
				sequence: recentTurns.at(-1)?.sequence ?? 0,
				queryStrategy: 'direct',
			}
		);
		const memories = {
			...retrievedMemories,
			relevantLore: mergeFinanceReportLore(
				retrievedMemories.relevantLore,
				characterLoreResponse.loreInfos
			),
		};
		const context = resolveRagContext({
			sessionId: session.sessionId,
			userId,
			currentMessage: input.requestText,
			character,
			profile: profileResponse.profileInfo,
			memories,
		});
		const reportConversationContext = buildFinanceReportConversationContext(context, reportTurns);
		if (getEligibleProducts(context).size === 0) {
			throw new ApiError(422, 'No eligible fictional finance product evidence was retrieved.');
		}
		const generated = await llmService.invokeStructuredLlm(
			buildFinanceReportMessages(context, reportConversationContext),
			aiModelInfo,
			userId,
			financeReportOutputSchema
		);
		const validated = validateFinanceReportEvidence(generated, context);
		const sourceRefs = buildFinanceReportSourceRefs(
			context.memories,
			reportConversationContext.turns.map(({ turnId }) => turnId)
		);
		return documentStore.createDraft({
			userId,
			sessionId: session.sessionId,
			characterId: session.characterId,
			origin: 'generated',
			includeInRag: false,
			title: validated.title,
			body: renderFinanceReportMarkdown(validated, context, reportConversationContext),
			documentKind: 'personalized-finance-report',
			issuer: 'Fictional Finance RAG Demo',
			viewpoint: 'Educational demo output',
			groundingMode: 'grounded',
			requestText: input.requestText,
			sourceRefs,
			modelName: aiModelInfo.model,
			promptVersion: 'finance-report-v6',
		});
	},
};
