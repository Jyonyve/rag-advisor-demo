// src/server/services/orchestrationService.ts (Updated)

import { ChatGenerationStage, MemoryResponse } from '@rag-advisor-demo/shared/api';
import { ABORT_TIMEOUT, METADATA_TYPES } from '@rag-advisor-demo/shared/config';
import {
	TempChatTurnCdo,
	CharacterInfo,
	ProfileInfo,
	AiModelInfo,
	TempChatTurn,
	ChatTurnCdo,
	ChatTurn,
	ApiError,
	ChatMessageSet,
} from '@rag-advisor-demo/shared/domain';
import { createBasicChatTurn, buildTempChatTurnId } from '@rag-advisor-demo/shared/util';
import { chatStore } from '../store/chatStore.js';
import { tempStore } from '../store/tempStore.js';
import {
	parseEntriesToConversation,
	buildChatMessage,
	buildChatMessageFromEntries,
} from '../util/chatParseUtils.js';
import { detectLanguage } from '../util/languageUtils.js';
import { sanitizeLlmResponse } from '../util/llmUtils.js';
import {
	createOperationLogger,
	flowLogger,
	OperationLogger,
	serializeError,
} from '../util/jsonlLogger.js';
import { handleServiceError } from '../util/serviceHelpers.js';
import { memoryEngine } from './memoryEngine.js';
import { personaEngine } from './personaEngine.js';
import { resolveRagContext } from './ragContextService.js';

export interface ReceiveBotResponseOptions {
	adultContentEnabled?: boolean;
	signal?: AbortSignal;
	onStatus?: (stage: ChatGenerationStage) => void;
	onDelta?: (delta: string) => void;
}

export const FINANCE_DEMO_NOTICE =
	'Demo notice: Products and scenarios are fictional demo data. Attributed public regulatory sources may be real. This is educational information, not financial advice or legal advice.';
export const FINANCE_DEMO_NOTICE_KO =
	'안내: 상품과 조건은 모두 가상인 교육용 예시이며, 금융·법률 자문이 아닙니다. 실제 상품을 선택하기 전에는 공식 상품 설명을 확인해 주세요.';
export const HEALTHCARE_OPERATIONS_DEMO_NOTICE =
	'Demo notice: This facility, workflow, and scenario are fictional demo data. This is administrative guidance, not medical advice.';

export const ensureDomainDemoDisclaimer = (
	response: string,
	character: Pick<CharacterInfo, 'domain'>
): string => {
	if (
		character.domain === 'finance' &&
		!/(?:not financial advice|금융(?:\s*(?:·|또는)\s*법률)?\s*자문이\s*아닙니다)/i.test(response)
	) {
		const notice = /[가-힣]/.test(response) ? FINANCE_DEMO_NOTICE_KO : FINANCE_DEMO_NOTICE;
		return `${response.trim()}\n\n${notice}`;
	}
	if (character.domain === 'healthcare_operations' && !/not medical advice/i.test(response)) {
		return `${response.trim()}\n\n${HEALTHCARE_OPERATIONS_DEMO_NOTICE}`;
	}
	return response;
};

/**
 * FINAL VERSION:
 * 클라이언트가 호출하는 메인 엔드포인트.
 * 타임아웃 및 성능 측정과 같은 전체적인 흐름을 관리하고,
 * 세부 로직은 내부 헬퍼 함수에 위임합니다.
 */
export const receiveBotResponse = async (
	tempChatTurnCdo: TempChatTurnCdo,
	characterInfo: CharacterInfo,
	profileInfo: ProfileInfo,
	aiModelInfo: AiModelInfo,
	recentChatTurnString: string,
	options: ReceiveBotResponseOptions = {}
): Promise<TempChatTurn> => {
	const { sequence, sessionId, inputJsonString } = tempChatTurnCdo;
	const requestId = `chat:${sessionId}:${sequence}:${Date.now()}`;
	const logger = createOperationLogger('orchestrationService', 'receiveBotResponse', {
		requestId,
		sessionId,
		turn: sequence,
		userId: tempChatTurnCdo.userId,
		model: aiModelInfo.model,
	});

	const controller = new AbortController();
	const abortFromCaller = () => controller.abort(options.signal?.reason);
	if (options.signal?.aborted) {
		abortFromCaller();
	} else {
		options.signal?.addEventListener('abort', abortFromCaller, { once: true });
	}
	const timeoutId = setTimeout(() => {
		logger.warn('timeout', { timeoutSeconds: ABORT_TIMEOUT });
		controller.abort();
	}, ABORT_TIMEOUT * 1000);

	logger.info('start');

	try {
		options.onStatus?.('preparing');
		// 1. 턴 가져오기 또는 생성
		let tempTurn = await _getOrCreateTempTurn(sessionId, sequence, tempChatTurnCdo.userId);
		// --- 2. LOG CHECKPOINT 1 ---
		logger.checkpoint('tempTurn.ready', { existingOptionCount: tempTurn.setCount });
		const userConverSation = parseEntriesToConversation(JSON.parse(inputJsonString));

		// 2. 새로운 응답 생성 및 추가 (책임 위임)
		tempTurn = await _generateAndAppendResponse(
			tempTurn,
			userConverSation,
			characterInfo,
			profileInfo,
			aiModelInfo,
			recentChatTurnString,
			{
				signal: controller.signal,
				adultContentEnabled: options.adultContentEnabled,
				onStatus: options.onStatus,
				onDelta: options.onDelta,
				logger,
			}
		);
		logger.checkpoint('llm.responseFinished', { optionCount: tempTurn.setCount });
		// 3. 최종 상태 저장
		options.onStatus?.('saving');
		await tempStore.saveTempChatTurn(tempTurn);
		logger.checkpoint('tempTurn.saved', { optionCount: tempTurn.setCount });

		logger.complete({ optionCount: tempTurn.setCount });
		return tempTurn;
	} catch (error: any) {
		logger.error('failed', { error: error instanceof Error ? error.message : String(error) });
		handleServiceError(
			error,
			`[Orchestrator] Failed to process chat request for session ${sessionId}, turn ${sequence}.`,
			'An unexpected error occurred while processing the request.'
		);
	} finally {
		clearTimeout(timeoutId);
		options.signal?.removeEventListener('abort', abortFromCaller);
	}
};

/**
 * Finalizes a temporary chat turn by enriching its metadata via LLM and storing it
 * as a permanent ChatTurn in the main chat history.
 *
 * This function completes the flow for a specific, chosen chat turn.
 *
 * @param chatTurnCdo - The basic information of the chat turn to be finalized (request, response, sequence, sessionId).
 * @returns The fully enriched ChatTurn object after being stored.
 */
export const finalizeChatTurn = async (chatTurnCdo: ChatTurnCdo): Promise<ChatTurn> => {
	const { sessionId, sequence } = chatTurnCdo;
	const logger = createOperationLogger('orchestrationService', 'finalizeChatTurn', {
		sessionId,
		turn: sequence,
		userId: chatTurnCdo.userId,
	});
	logger.info('start');

	try {
		const enrichedChatTurn = await enrichChatTurn(chatTurnCdo);
		await chatStore.storeChatTurn(enrichedChatTurn);

		logger.complete();
		return enrichedChatTurn;
	} catch (error: any) {
		logger.error('failed', serializeError(error));
		handleServiceError(
			error,
			`[Orchestrator] Failed to finalize chat turn for session ${sessionId}, sequence ${sequence}.`,
			'An unexpected error occurred while finalizing the chat turn.'
		);
	}
};

export const enrichChatTurn = async (chatTurnCdo: ChatTurnCdo): Promise<ChatTurn> => {
	const basicChatTurn: ChatTurn = createBasicChatTurn(chatTurnCdo);
	return memoryEngine.enrichChatTurnViaLlm(basicChatTurn);
};

/**
 * [HELPER] Retrieves an existing TempChatTurn or creates a new one if it doesn't exist.
 * This function now uses error handling to manage the control flow.
 * @private
 */
const _getOrCreateTempTurn = async (
	sessionId: string,
	sequence: number,
	userId: string
): Promise<TempChatTurn> => {
	try {
		// 1. Attempt to fetch the TempChatTurn.
		// getTempChatTurn will now throw an ApiError with status 404 if not found.
		const response = await tempStore.getTempChatTurn(sessionId, sequence);
		flowLogger.info('orchestrationService', 'tempTurn.found', { sessionId, turn: sequence });
		// Assuming the response object contains the turn, e.g., { tempChatTurn: ... }
		return response.tempChatTurn;
	} catch (error: any) {
		// 2. Check if the error is the specific "Not Found" error.
		if (error instanceof ApiError && error.status === 404) {
			// 3. If it is a 404, the turn doesn't exist. Create a new one.
			flowLogger.info('orchestrationService', 'tempTurn.create', { sessionId, turn: sequence });
			const now = new Date().toISOString();
			return {
				userId,
				tempTurnId: buildTempChatTurnId(sessionId, sequence),
				sessionId,
				sequence,
				chatTurnSets: [],
				type: METADATA_TYPES.TEMP,
				createdAt: now,
				updatedAt: now,
				setCount: 0,
				fixedSetNo: -1,
			};
		} else {
			// 4. For any other error (e.g., 500), re-throw it to be handled by the caller.
			flowLogger.error('orchestrationService', 'tempTurn.lookup.failed', {
				sessionId,
				turn: sequence,
				...serializeError(error),
			});
			throw error;
		}
	}
};
// In src/server/services/orchestrationService.ts

/**
 * [HELPER] Generates a new AI response and adds it to the temp turn's options.
 * This is the core business logic for a single response generation.F
 * @private
 */
async function _generateAndAppendResponse(
	tempTurn: TempChatTurn,
	userConversation: string,
	characterInfo: CharacterInfo,
	profileInfo: ProfileInfo,
	aiModelInfo: AiModelInfo,
	recentChatTurnString: string,
	options: {
		signal?: AbortSignal;
		adultContentEnabled?: boolean;
		onStatus?: (stage: ChatGenerationStage) => void;
		onDelta?: (delta: string) => void;
		logger?: OperationLogger;
	}
): Promise<TempChatTurn> {
	// 1. Recall relevant memories for context.
	const langCode = detectLanguage(userConversation);
	const recentChatTurn: ChatTurn[] = JSON.parse(recentChatTurnString);

	// 1. Initialize with a default, empty memory context.
	let recalledMemories: MemoryResponse = {
		langCode,
		shortTermHistory: recentChatTurn ?? [],
		longTermHistory: [],
		relevantLore: [],
		relevantHistory: [],
		factualRecapSummary: '',
		relationshipRecapSummary: '',
	};

	options.onStatus?.('retrieving');
	options.logger?.checkpoint('memoryRecall.start', { recentTurnCount: recentChatTurn.length });
	try {
		recalledMemories = await memoryEngine.recallRelevantMemories(
			tempTurn.sessionId,
			userConversation,
			tempTurn.userId,
			recentChatTurn,
			langCode,
			{
				userShowName: profileInfo.showName,
				characterShowName: characterInfo.showName,
				turnId: tempTurn.tempTurnId,
				sequence: tempTurn.sequence,
			}
		);
		options.logger?.checkpoint('memoryRecall.complete', {
			shortTermCount: recalledMemories.shortTermHistory.length,
			longTermCount: recalledMemories.longTermHistory.length,
			loreCount: recalledMemories.relevantLore.length,
			historyCount: recalledMemories.relevantHistory.length,
			hasFactualRecap: Boolean(recalledMemories.factualRecapSummary),
			hasRelationshipRecap: Boolean(recalledMemories.relationshipRecapSummary),
		});
	} catch (error: any) {
		if (error instanceof ApiError && error.status === 404) {
			options.logger?.warn('memoryRecall.empty', { status: 404 });
		} else {
			throw error;
		}
	}

	const resolvedRagContext = resolveRagContext({
		sessionId: tempTurn.sessionId,
		userId: tempTurn.userId,
		currentMessage: userConversation,
		character: characterInfo,
		profile: profileInfo,
		memories: recalledMemories,
	});
	recalledMemories = resolvedRagContext.memories;
	tempTurn.ragEvidence = resolvedRagContext.evidence;

	// 2. Generate the new persona response.
	options.onStatus?.('generating');
	options.logger?.checkpoint('personaGeneration.start');
	const personaResponse = await personaEngine.generateResponse(
		recalledMemories,
		characterInfo,
		profileInfo,
		resolvedRagContext.currentMessage,
		aiModelInfo,
		{
			signal: options.signal,
			adultContentEnabled: options.adultContentEnabled,
			onDelta: options.onDelta,
		}
	);
	options.logger?.checkpoint('personaGeneration.complete', { emotion: personaResponse.emotion });

	const finalResponseText = ensureDomainDemoDisclaimer(personaResponse.response, characterInfo);
	const botChatEntries =
		characterInfo.domain === 'finance'
			? [{ type: 'dialogue' as const, prompt: finalResponseText.replace(/\r\n|\r/g, '\n').trim() }]
			: sanitizeLlmResponse(finalResponseText);
	// 3. Create the new bot response message.
	const request = buildChatMessage(
		'user',
		tempTurn.sequence,
		profileInfo.showName,
		userConversation,
		tempTurn.sessionId
	);
	const response = buildChatMessageFromEntries(
		'assistant',
		tempTurn.sequence,
		characterInfo.showName,
		botChatEntries,
		tempTurn.sessionId,
		personaResponse.emotion,
		aiModelInfo.model
	);
	const newChatTurnSet: ChatMessageSet = { request, response, setNo: tempTurn.chatTurnSets.length };

	// 4. Append the new response to the options array and update the timestamp.
	tempTurn.chatTurnSets.push(newChatTurnSet);
	tempTurn.setCount = tempTurn.chatTurnSets.length;
	tempTurn.updatedAt = new Date().toISOString();

	return tempTurn;
}
