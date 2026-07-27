import { z } from 'zod';
import type { ChatCompletionMessageParam } from 'openai/resources/index.mjs';

import { RECENT_CHAT_TURN } from '@rag-advisor-demo/shared/config';
import {
	ApiError,
	type FinanceReportDraftCreate,
	type LoreInfo,
	type SessionInfo,
	financeLoreStructuredMetadataSchema,
} from '@rag-advisor-demo/shared/domain';

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
		rationale: z.string().trim().min(1).max(2_000),
		riskWarnings: z.array(z.string().trim().min(1).max(1_000)).min(1).max(8),
		evidenceIds: z.array(z.string().trim().min(1).max(300)).min(1).max(12),
	})
	.strict();

export const financeReportOutputSchema = z
	.object({
		title: z.string().trim().min(1).max(300),
		summary: z.string().trim().min(1).max(4_000),
		productMatches: z.array(financeReportMatchSchema).max(3),
		generalRiskWarnings: z.array(z.string().trim().min(1).max(1_000)).min(1).max(12),
	})
	.strict();

export type FinanceReportOutput = z.infer<typeof financeReportOutputSchema>;

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
	return output;
};

const renderList = (values: readonly string[], emptyLabel: string): string =>
	values.length > 0 ? values.map((value) => `- ${escapeHtml(value)}`).join('\n') : `- ${emptyLabel}`;

export const renderFinanceReportMarkdown = (
	output: FinanceReportOutput,
	context: ResolvedRagContext
): string => {
	const eligibleProducts = getEligibleProducts(context);
	const productSections = output.productMatches.length
		? output.productMatches
				.map((match) => {
					const product = eligibleProducts.get(match.productFixtureId)!;
					return `### ${escapeHtml(product.title)}

${escapeHtml(match.rationale)}

Risk warnings:
${renderList(match.riskWarnings, 'No model-provided warning.')}

Evidence:
${renderList(
	match.evidenceIds.map((sourceId) => `[${sourceId}]`),
	'No evidence ID.'
)}`;
				})
				.join('\n\n')
		: 'No fictional product match was supported by the eligible evidence.';

	return `# ${escapeHtml(output.title)}

> Demo notice: This report uses fictional products and scenarios for a technical RAG demonstration. Attributed public regulatory sources may be real. It is educational information, not financial advice or legal advice. No return, principal, income, or outcome is guaranteed.

## Summary

${escapeHtml(output.summary)}

## Session profile fields used

${renderList(context.evidence.profileFieldsUsed, 'No profile fields beyond the domain.')}

## Temporary assumptions

${renderList(
	context.evidence.assumptions.map(({ description }) => description),
	'No temporary assumptions.'
)}

## Missing information

${renderList(
	context.evidence.missingInformation.map(({ field }) => field),
	'No required profile information was identified as missing.'
)}

## Fictional product matches

${productSections}

## General risk warnings

${renderList(output.generalRiskWarnings, 'No model-provided general warning.')}
`;
};

const buildFinanceEvidencePayload = (context: ResolvedRagContext) => ({
	sessionProfile: context.sessionProfile,
	currentRequest: context.currentMessage,
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
	context: ResolvedRagContext
): ChatCompletionMessageParam[] => [
	{
		role: 'system',
		content: `Create a personalized finance report for a fictional technical RAG demonstration.
Use only the supplied eligible evidence for product-specific claims.
Return at most three eligible fictional products. Each product must use its exact fixtureId and must cite its product Lore source ID plus any supporting evidence IDs.
Do not include an excluded product. Do not invent products, rates, fees, guarantees, issuers, tax treatment, or evidence IDs.
Use conditional educational wording. Explain material risk, liquidity, horizon, assumptions, and missing information.
Never claim to be a licensed adviser, execute transactions, guarantee outcomes, or provide real financial advice.
The server adds the fixed demo disclaimer and authoritative assumptions/missing-information sections.`,
	},
	{
		role: 'user',
		content: `Build the report from this server-resolved context:\n${JSON.stringify(
			buildFinanceEvidencePayload(context),
			null,
			2
		)}`,
	},
];

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
		const recentTurns = chatResponse.chatTurns
			.sort((a, b) => a.sequence - b.sequence)
			.slice(-RECENT_CHAT_TURN);
		const retrievedMemories = await memoryEngine.recallRelevantMemories(
			session.sessionId,
			input.requestText,
			userId,
			recentTurns,
			detectLanguage(input.requestText),
			{
				userShowName: profileResponse.profileInfo.showName,
				characterShowName: character.showName,
				turnId: `${session.sessionId}:finance-report`,
				sequence: recentTurns.at(-1)?.sequence ?? 0,
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
		if (getEligibleProducts(context).size === 0) {
			throw new ApiError(422, 'No eligible fictional finance product evidence was retrieved.');
		}
		const generated = await llmService.invokeStructuredLlm(
			buildFinanceReportMessages(context),
			aiModelInfo,
			userId,
			financeReportOutputSchema
		);
		const validated = validateFinanceReportEvidence(generated, context);
		const sourceRefs = buildDocumentSourceRefs(context.memories);
		return documentStore.createDraft({
			userId,
			sessionId: session.sessionId,
			characterId: session.characterId,
			origin: 'generated',
			includeInRag: false,
			title: validated.title,
			body: renderFinanceReportMarkdown(validated, context),
			documentKind: 'personalized-finance-report',
			issuer: 'Fictional Finance RAG Demo',
			viewpoint: 'Educational demo output',
			groundingMode: 'grounded',
			requestText: input.requestText,
			sourceRefs,
			modelName: aiModelInfo.model,
			promptVersion: 'finance-report-v1',
		});
	},
};
