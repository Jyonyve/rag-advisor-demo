import { and, eq } from 'drizzle-orm';
import { LoreResponse, Metadata } from '@rag-advisor-demo/shared/api';
import { ApiError, LoreInfo } from '@rag-advisor-demo/shared/domain';
import { loreToMetadata } from '@rag-advisor-demo/shared/util';
import { getDatabase } from '../db/postgresClient.js';
import { lores } from '../db/schema.js';
import {
	deleteMemoryEmbeddings,
	QueryEmbeddingCache,
	searchMemoryEmbeddings,
} from '../service/embeddingService.js';
import { embeddingJobService } from '../service/embeddingJobService.js';
import { loreToDocument } from '../util/documentUtils.js';
import { RagTraceContext } from '../util/ragTraceUtils.js';
import { FilterCriteria } from '../util/schemaUtils.js';
import { parseOfficialLoreMetadata } from '../util/domainValidationUtils.js';

const emptyResponse = (): LoreResponse => ({
	ids: [],
	metadatas: [],
	documents: [],
	loreInfo: {} as LoreInfo,
	loreContent: '',
	loreInfos: [],
	loreContents: [],
});

const toResponse = (items: LoreInfo[]): LoreResponse => ({
	ids: items.map((item) => item.loreId),
	metadatas: items.map((item) => loreToMetadata(item) as unknown as Metadata),
	documents: items.map(loreToDocument),
	loreInfo: items[0] ?? ({} as LoreInfo),
	loreContent: items[0]?.content ?? '',
	loreInfos: items,
	loreContents: items.map((item) => item.content),
});

const matchesCriteria = (item: LoreInfo, criteria?: FilterCriteria) => {
	if (!criteria) return true;
	const searchable = [
		...(item.keywordList ?? []),
		...(item.topicList ?? []),
		...(item.entityList ?? []),
		...(item.characterIds ?? []),
	].map((value) => value.toLowerCase());
	const requested = [
		...(criteria.keywords ?? []),
		...(criteria.topics ?? []),
		...(criteria.entities?.characters ?? []),
		...(criteria.entities?.locations ?? []),
		...(criteria.entities?.items ?? []),
	].map((value) => value.toLowerCase());
	return requested.length === 0 || requested.some((value) => searchable.includes(value));
};

export const filterLoreCandidates = (
	items: LoreInfo[],
	userId: string,
	characterIds: string | string[],
	sessionId?: string,
	filterCriteria?: FilterCriteria
): LoreInfo[] => {
	const ids = Array.isArray(characterIds) ? characterIds : [characterIds];
	return items.filter(
		(item) =>
			item.userId === userId &&
			(item.sessionId
				? item.sessionId === sessionId
				: item.category === 'World' ||
					item.characterIds.some((id) => ids.includes(id)) ||
					matchesCriteria(item, filterCriteria))
	);
};

export const loreStore = {
	storeLore: async (loreInfo: LoreInfo): Promise<{ loreId: string }> => {
		const now = new Date().toISOString();
		const validatedLore: LoreInfo = { ...loreInfo, ...parseOfficialLoreMetadata(loreInfo) };
		const storedRows = await getDatabase()
			.insert(lores)
			.values({
				loreId: validatedLore.loreId,
				userId: validatedLore.userId,
				loreType: validatedLore.type,
				category: validatedLore.category,
				data: validatedLore,
				createdAt: validatedLore.createdAt || now,
				updatedAt: validatedLore.updatedAt || now,
			})
			.onConflictDoUpdate({
				target: lores.loreId,
				setWhere: eq(lores.userId, validatedLore.userId),
				set: {
					loreType: validatedLore.type,
					category: validatedLore.category,
					data: validatedLore,
					updatedAt: validatedLore.updatedAt || now,
				},
			})
			.returning({ loreId: lores.loreId });
		if (storedRows.length === 0) {
			throw new ApiError(403, `Lore '${loreInfo.loreId}' is owned by another user.`);
		}
		embeddingJobService.enqueue({
			sourceType: 'lore',
			sourceId: validatedLore.loreId,
			userId: validatedLore.userId,
			content: loreToDocument(validatedLore),
			metadata: loreToMetadata(validatedLore) as unknown as Metadata,
		});
		return { loreId: validatedLore.loreId };
	},

	getLore: async (loreId: string, userId: string): Promise<LoreResponse> => {
		const row = await getDatabase().query.lores.findFirst({
			where: and(eq(lores.loreId, loreId), eq(lores.userId, userId)),
		});
		return row ? toResponse([row.data]) : emptyResponse();
	},

	getLoresByCharacter: async (characterId: string, userId: string): Promise<LoreResponse> => {
		const rows = await getDatabase()
			.select({ data: lores.data })
			.from(lores)
			.where(eq(lores.userId, userId));
		return toResponse(
			rows
				.map((row) => row.data)
				.filter(
					(item) => item.userId === userId && !item.sessionId && item.characterIds.includes(characterId)
				)
		);
	},

	getLoresBySession: async (
		sessionId: string,
		characterId: string,
		userId: string
	): Promise<LoreResponse> => {
		const rows = await getDatabase()
			.select({ data: lores.data })
			.from(lores)
			.where(eq(lores.userId, userId));
		return toResponse(
			filterLoreCandidates(
				rows.map((row) => row.data),
				userId,
				characterId,
				sessionId
			)
		);
	},

	getWorldLores: async (userId: string): Promise<LoreResponse> => {
		const rows = await getDatabase()
			.select({ data: lores.data })
			.from(lores)
			.where(and(eq(lores.category, 'World'), eq(lores.userId, userId)));
		return toResponse(rows.map((row) => row.data));
	},

	deleteLore: async (loreId: string, userId: string): Promise<void> => {
		const deletedRows = await getDatabase()
			.delete(lores)
			.where(and(eq(lores.loreId, loreId), eq(lores.userId, userId)))
			.returning({ loreId: lores.loreId });
		if (deletedRows.length > 0) await deleteMemoryEmbeddings('lore', loreId);
	},

	queryLores: async (
		characterIds: string | string[],
		userId: string,
		sessionId: string,
		queryTexts: string[],
		filterCriteria?: FilterCriteria,
		_whereDocument?: unknown,
		limit = 10,
		queryEmbeddingCache?: QueryEmbeddingCache,
		ragTraceContext?: RagTraceContext
	): Promise<LoreResponse> => {
		const rows = await getDatabase()
			.select({ data: lores.data })
			.from(lores)
			.where(eq(lores.userId, userId));
		const candidates = filterLoreCandidates(
			rows.map((row) => row.data),
			userId,
			characterIds,
			sessionId,
			filterCriteria
		);
		if (!candidates.length) return emptyResponse();
		const results = await searchMemoryEmbeddings(
			queryTexts,
			{ sourceType: 'lore', userId, sourceIds: candidates.map((item) => item.loreId) },
			limit,
			queryEmbeddingCache,
			ragTraceContext
		);
		const byId = new Map(candidates.map((item) => [item.loreId, item]));
		return toResponse(
			results.map((result) => byId.get(result.sourceId)).filter(Boolean) as LoreInfo[]
		);
	},

	clearCollectionCache: (): void => {},
};
