import { and, desc, eq, sql } from 'drizzle-orm';
import {
	ApiError,
	type DocumentDraftRewrite,
	type DocumentDraftUpdate,
	type DocumentInfo,
} from '@rag-advisor-demo/shared/domain';
import { buildDocumentId } from '@rag-advisor-demo/shared/util';
import { getDatabase } from '../db/postgresClient.js';
import { documents } from '../db/schema.js';
import {
	deleteMemoryEmbeddings,
	type QueryEmbeddingCache,
	searchMemoryEmbeddings,
} from '../service/embeddingService.js';
import type { RagTraceContext } from '../util/ragTraceUtils.js';
import { embeddingJobService } from '../service/embeddingJobService.js';

export type CreateDocumentDraftInput = Pick<
	DocumentInfo,
	| 'userId'
	| 'sessionId'
	| 'characterId'
	| 'origin'
	| 'title'
	| 'body'
	| 'documentKind'
	| 'issuer'
	| 'viewpoint'
	| 'groundingMode'
	| 'requestText'
	| 'sourceRefs'
	| 'modelName'
	| 'promptVersion'
	| 'includeInRag'
>;

const getOwnedDocument = async (documentId: string, userId: string): Promise<DocumentInfo> => {
	const row = await getDatabase().query.documents.findFirst({
		where: and(eq(documents.documentId, documentId), eq(documents.userId, userId)),
	});
	if (!row) throw new ApiError(404, `Document '${documentId}' was not found.`);
	return row.data;
};

export const documentToEmbeddingContent = (document: DocumentInfo): string =>
	[
		`In-world document: ${document.title}`,
		document.documentKind ? `Document type: ${document.documentKind}` : undefined,
		document.issuer ? `Issuer: ${document.issuer}` : undefined,
		document.viewpoint ? `Viewpoint: ${document.viewpoint}` : undefined,
		`Grounding: ${document.groundingMode}`,
		'',
		document.body,
	]
		.filter((line): line is string => line !== undefined)
		.join('\n');

export const applyDocumentDraftUpdate = (
	document: DocumentInfo,
	input: DocumentDraftUpdate,
	updatedAt: string
): DocumentInfo => {
	if (document.status !== 'draft') {
		throw new ApiError(409, 'Only draft documents can be edited.');
	}
	if (document.revision !== input.expectedRevision) {
		throw new ApiError(409, 'This document changed after it was opened. Reload it before editing.');
	}

	return {
		...document,
		...(input.title !== undefined ? { title: input.title } : {}),
		...(input.body !== undefined ? { body: input.body } : {}),
		...(input.documentKind !== undefined ? { documentKind: input.documentKind || undefined } : {}),
		...(input.issuer !== undefined ? { issuer: input.issuer || undefined } : {}),
		...(input.viewpoint !== undefined ? { viewpoint: input.viewpoint || undefined } : {}),
		...(input.includeInRag !== undefined ? { includeInRag: input.includeInRag } : {}),
		revision: document.revision + 1,
		updatedAt,
	};
};

export type ApplyDocumentDraftRewriteInput = Pick<
	DocumentInfo,
	| 'title'
	| 'body'
	| 'documentKind'
	| 'issuer'
	| 'viewpoint'
	| 'groundingMode'
	| 'requestText'
	| 'sourceRefs'
	| 'modelName'
	| 'promptVersion'
>;

export const applyDocumentDraftRewrite = (
	document: DocumentInfo,
	input: DocumentDraftRewrite,
	rewrite: ApplyDocumentDraftRewriteInput,
	updatedAt: string
): DocumentInfo => {
	if (document.status !== 'draft') {
		throw new ApiError(409, 'Only draft documents can be edited.');
	}
	if (document.revision !== input.expectedRevision) {
		throw new ApiError(409, 'This document changed after it was opened. Reload it before editing.');
	}

	return {
		...document,
		...rewrite,
		origin: 'generated',
		status: 'draft',
		retrievalEnabled: false,
		includeInRag: document.includeInRag,
		revision: document.revision + 1,
		updatedAt,
	};
};

export const documentStore = {
	createDraft: async (input: CreateDocumentDraftInput): Promise<DocumentInfo> => {
		const now = new Date().toISOString();
		const document: DocumentInfo = {
			...input,
			documentId: buildDocumentId(input.sessionId),
			status: 'draft',
			retrievalEnabled: false,
			includeInRag: input.includeInRag,
			revision: 1,
			createdAt: now,
			updatedAt: now,
		};
		await getDatabase()
			.insert(documents)
			.values({
				documentId: document.documentId,
				userId: document.userId,
				sessionId: document.sessionId,
				characterId: document.characterId,
				origin: document.origin,
				status: document.status,
				retrievalEnabled: false,
				data: document,
				createdAt: now,
				updatedAt: now,
			});
		return document;
	},

	getDocument: getOwnedDocument,

	getDocumentsBySession: async (sessionId: string, userId: string): Promise<DocumentInfo[]> => {
		const rows = await getDatabase()
			.select({ data: documents.data })
			.from(documents)
			.where(and(eq(documents.sessionId, sessionId), eq(documents.userId, userId)))
			.orderBy(desc(documents.updatedAt));
		return rows.map((row) => row.data);
	},

	queryApproved: async (
		sessionId: string,
		userId: string,
		queryTexts: string[],
		limit = 5,
		queryEmbeddingCache?: QueryEmbeddingCache,
		ragTraceContext?: RagTraceContext
	): Promise<DocumentInfo[]> => {
		const rows = await getDatabase()
			.select({ data: documents.data })
			.from(documents)
			.where(
				and(
					eq(documents.sessionId, sessionId),
					eq(documents.userId, userId),
					eq(documents.status, 'approved'),
					eq(documents.retrievalEnabled, true)
				)
			);
		if (!rows.length) return [];
		const candidates = rows.map((row) => row.data);
		const results = await searchMemoryEmbeddings(
			queryTexts,
			{
				sourceType: 'document',
				userId,
				sessionId,
				sourceIds: candidates.map((item) => item.documentId),
			},
			limit,
			queryEmbeddingCache,
			ragTraceContext
		);
		const byId = new Map(candidates.map((item) => [item.documentId, item]));
		return results.map((result) => byId.get(result.sourceId)).filter(Boolean) as DocumentInfo[];
	},

	updateDraft: async (
		documentId: string,
		userId: string,
		input: DocumentDraftUpdate
	): Promise<DocumentInfo> => {
		const current = await getOwnedDocument(documentId, userId);
		const next = applyDocumentDraftUpdate(current, input, new Date().toISOString());
		const rows = await getDatabase()
			.update(documents)
			.set({ data: next, updatedAt: next.updatedAt })
			.where(
				and(
					eq(documents.documentId, documentId),
					eq(documents.userId, userId),
					eq(documents.status, 'draft'),
					sql`(${documents.data}->>'revision')::integer = ${input.expectedRevision}`
				)
			)
			.returning({ data: documents.data });
		if (!rows[0]) throw new ApiError(409, 'The document is no longer editable.');
		return rows[0].data;
	},

	rewriteDraft: async (
		documentId: string,
		userId: string,
		input: DocumentDraftRewrite,
		rewrite: ApplyDocumentDraftRewriteInput
	): Promise<DocumentInfo> => {
		const current = await getOwnedDocument(documentId, userId);
		const next = applyDocumentDraftRewrite(current, input, rewrite, new Date().toISOString());
		const rows = await getDatabase()
			.update(documents)
			.set({ data: next, updatedAt: next.updatedAt })
			.where(
				and(
					eq(documents.documentId, documentId),
					eq(documents.userId, userId),
					eq(documents.status, 'draft'),
					sql`(${documents.data}->>'revision')::integer = ${input.expectedRevision}`
				)
			)
			.returning({ data: documents.data });
		if (!rows[0]) throw new ApiError(409, 'The document is no longer editable.');
		return rows[0].data;
	},

	approve: async (documentId: string, userId: string): Promise<DocumentInfo> => {
		const current = await getOwnedDocument(documentId, userId);
		if (current.status !== 'draft') throw new ApiError(409, 'Only draft documents can be approved.');
		if (!current.body.trim())
			throw new ApiError(400, 'A document must have content before approval.');

		const now = new Date().toISOString();
		const includeInRag = current.includeInRag ?? current.retrievalEnabled;
		const approved: DocumentInfo = {
			...current,
			status: 'approved',
			retrievalEnabled: includeInRag,
			includeInRag,
			revision: current.revision + 1,
			updatedAt: now,
		};
		const rows = await getDatabase()
			.update(documents)
			.set({ status: 'approved', retrievalEnabled: includeInRag, data: approved, updatedAt: now })
			.where(
				and(
					eq(documents.documentId, documentId),
					eq(documents.userId, userId),
					eq(documents.status, 'draft')
				)
			)
			.returning({ data: documents.data });
		if (!rows[0]) throw new ApiError(409, 'The document is no longer awaiting approval.');

		if (includeInRag)
			embeddingJobService.enqueue({
				sourceType: 'document',
				sourceId: documentId,
				contentType: 'in-world-document',
				userId,
				characterId: approved.characterId,
				sessionId: approved.sessionId,
				content: documentToEmbeddingContent(approved),
				metadata: {
					title: approved.title,
					origin: approved.origin,
					groundingMode: approved.groundingMode,
					issuer: approved.issuer ?? null,
					viewpoint: approved.viewpoint ?? null,
				},
			});
		return rows[0].data;
	},

	setRetrievalPreference: async (
		documentId: string,
		userId: string,
		enabled: boolean
	): Promise<DocumentInfo> => {
		const current = await getOwnedDocument(documentId, userId);
		if (current.status !== 'approved') {
			throw new ApiError(409, 'Only approved documents can change retrieval eligibility.');
		}
		const now = new Date().toISOString();
		const updated: DocumentInfo = {
			...current,
			includeInRag: enabled,
			retrievalEnabled: enabled,
			revision: current.revision + 1,
			updatedAt: now,
		};
		await getDatabase()
			.update(documents)
			.set({ retrievalEnabled: enabled, data: updated, updatedAt: now })
			.where(
				and(
					eq(documents.documentId, documentId),
					eq(documents.userId, userId),
					eq(documents.status, 'approved')
				)
			);

		if (enabled) {
			embeddingJobService.enqueue({
				sourceType: 'document',
				sourceId: documentId,
				contentType: 'in-world-document',
				userId,
				characterId: updated.characterId,
				sessionId: updated.sessionId,
				content: documentToEmbeddingContent(updated),
				metadata: {
					title: updated.title,
					origin: updated.origin,
					groundingMode: updated.groundingMode,
					issuer: updated.issuer ?? null,
					viewpoint: updated.viewpoint ?? null,
				},
			});
		} else {
			await deleteMemoryEmbeddings('document', documentId);
		}
		return updated;
	},

	archive: async (documentId: string, userId: string): Promise<DocumentInfo> => {
		const current = await getOwnedDocument(documentId, userId);
		if (current.status === 'archived') return current;
		const now = new Date().toISOString();
		const archived: DocumentInfo = {
			...current,
			status: 'archived',
			retrievalEnabled: false,
			revision: current.revision + 1,
			updatedAt: now,
		};
		await getDatabase()
			.update(documents)
			.set({ status: 'archived', retrievalEnabled: false, data: archived, updatedAt: now })
			.where(and(eq(documents.documentId, documentId), eq(documents.userId, userId)));
		await deleteMemoryEmbeddings('document', documentId);
		return archived;
	},

	deleteDraft: async (documentId: string, userId: string): Promise<void> => {
		const rows = await getDatabase()
			.delete(documents)
			.where(
				and(
					eq(documents.documentId, documentId),
					eq(documents.userId, userId),
					eq(documents.status, 'draft')
				)
			)
			.returning({ documentId: documents.documentId });
		if (!rows[0]) throw new ApiError(409, 'Only draft documents can be deleted.');
	},
};
