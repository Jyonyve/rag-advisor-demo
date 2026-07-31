import express, { type Request, type Response, type Router } from 'express';
import { verifySession } from 'supertokens-node/recipe/session/framework/express';
import {
	documentDraftUpdateSchema,
	documentDraftRewriteSchema,
	documentRetrievalPreferenceSchema,
	financeReportDraftCreateSchema,
	generatedDocumentDraftCreateSchema,
	manualDocumentDraftCreateSchema,
	type DocumentDraftRewrite,
	type DocumentDraftUpdate,
	type DocumentInfo,
	type FinanceReportDraftCreate,
	type GeneratedDocumentDraftCreate,
	type ManualDocumentDraftCreate,
} from '@rag-advisor-demo/shared/domain';
import { ApiError } from '@rag-advisor-demo/shared/domain';
import { documentStore } from '../store/documentStore.js';
import { assertNotDemoGuest, assertOwnedSession, getSessionUserId } from '../util/authUtils.js';
import { asyncHandler, genRoutePattern } from '../util/routeHelpers.js';
import { documentGenerationService } from '../service/documentGenerationService.js';
import { financeReportService } from '../service/financeReportService.js';
import {
	classifyDemoProviderError,
	finishDemoGeneration,
	getDemoUsageStatus,
	isDemoGuest,
	reserveDemoGeneration,
} from '../service/demoAccessService.js';
import { getServerEnv } from '../config/env.js';

const router: Router = express.Router();

const parseBody = <T>(schema: { safeParse: (value: unknown) => any }, body: unknown): T => {
	const result = schema.safeParse(body);
	if (!result.success) {
		throw new ApiError(400, 'Invalid document request.', undefined, result.error.flatten());
	}
	return result.data as T;
};

router.post(
	genRoutePattern('createManualDraft'),
	verifySession(),
	asyncHandler(async (req: Request, res: Response): Promise<void> => {
		await assertNotDemoGuest(req);
		const input = parseBody<ManualDocumentDraftCreate>(manualDocumentDraftCreateSchema, req.body);
		const session = await assertOwnedSession(req, input.sessionId);
		const document = await documentStore.createDraft({
			...input,
			userId: getSessionUserId(req),
			characterId: session.characterId,
			origin: 'manual',
			includeInRag: false,
			groundingMode: 'invented',
			sourceRefs: { chatTurnIds: [], loreIds: [], historyIds: [], recapIds: [], documentIds: [] },
		});
		res.status(201).json({ documentInfo: document, documentInfos: [document] });
	})
);

router.post(
	genRoutePattern('generateDraft'),
	verifySession(),
	asyncHandler(async (req: Request, res: Response): Promise<void> => {
		await assertNotDemoGuest(req);
		const input = parseBody<GeneratedDocumentDraftCreate>(
			generatedDocumentDraftCreateSchema,
			req.body
		);
		const session = await assertOwnedSession(req, input.sessionId);
		const document = await documentGenerationService.generateDraft(
			input,
			getSessionUserId(req),
			session
		);
		res.status(201).json({ documentInfo: document, documentInfos: [document] });
	})
);

router.post(
	genRoutePattern('generateFinanceReport'),
	verifySession(),
	asyncHandler(async (req: Request, res: Response): Promise<void> => {
		const input = parseBody<FinanceReportDraftCreate>(financeReportDraftCreateSchema, req.body);
		const session = await assertOwnedSession(req, input.sessionId);
		const userId = getSessionUserId(req);
		if (!(await isDemoGuest(userId))) {
			const document = await financeReportService.generateDraft(input, userId, session);
			res.status(201).json({ documentInfo: document, documentInfos: [document] });
			return;
		}
		if (input.requestText.length > getServerEnv().DEMO_MAX_INPUT_CHARS) {
			throw new ApiError(
				400,
				`Demo requests must not exceed ${getServerEnv().DEMO_MAX_INPUT_CHARS} characters.`
			);
		}
		const reservation = await reserveDemoGeneration(userId, 'report');
		if (!reservation.allowed) {
			const document = await financeReportService.generateFallbackDraft(
				input,
				userId,
				session,
				reservation.reason
			);
			res
				.status(201)
				.json({
					documentInfo: document,
					documentInfos: [document],
					demoUsage: await getDemoUsageStatus(userId, 'fallback', reservation.reason),
				});
			return;
		}
		const signal = AbortSignal.timeout(getServerEnv().DEMO_REPORT_LLM_TIMEOUT_MS);
		try {
			const document = await financeReportService.generateDraft(input, userId, session, { signal });
			await finishDemoGeneration(reservation.usageId, 'succeeded');
			res
				.status(201)
				.json({
					documentInfo: document,
					documentInfos: [document],
					demoUsage: await getDemoUsageStatus(userId, 'live'),
				});
		} catch (error) {
			await finishDemoGeneration(reservation.usageId, 'failed');
			const reason = signal.aborted ? 'PROVIDER_TIMEOUT' : classifyDemoProviderError(error);
			const document = await financeReportService.generateFallbackDraft(
				input,
				userId,
				session,
				reason
			);
			res
				.status(201)
				.json({
					documentInfo: document,
					documentInfos: [document],
					demoUsage: await getDemoUsageStatus(userId, 'fallback', reason),
				});
		}
	})
);

router.get(
	genRoutePattern('getDocumentsBySession', ['sessionId']),
	verifySession(),
	asyncHandler(async (req: Request, res: Response): Promise<void> => {
		await assertOwnedSession(req, req.params.sessionId);
		const items = await documentStore.getDocumentsBySession(
			req.params.sessionId,
			getSessionUserId(req)
		);
		res.status(200).json({ documentInfo: items[0] ?? ({} as DocumentInfo), documentInfos: items });
	})
);

router.get(
	genRoutePattern('getDocument', ['documentId']),
	verifySession(),
	asyncHandler(async (req: Request, res: Response): Promise<void> => {
		const document = await documentStore.getDocument(req.params.documentId, getSessionUserId(req));
		res.status(200).json({ documentInfo: document, documentInfos: [document] });
	})
);

router.patch(
	genRoutePattern('updateDraft', ['documentId']),
	verifySession(),
	asyncHandler(async (req: Request, res: Response): Promise<void> => {
		await assertNotDemoGuest(req);
		const input = parseBody<DocumentDraftUpdate>(documentDraftUpdateSchema, req.body);
		const document = await documentStore.updateDraft(
			req.params.documentId,
			getSessionUserId(req),
			input
		);
		res.status(200).json({ documentInfo: document, documentInfos: [document] });
	})
);

router.post(
	genRoutePattern('rewriteDraft', ['documentId']),
	verifySession(),
	asyncHandler(async (req: Request, res: Response): Promise<void> => {
		await assertNotDemoGuest(req);
		const input = parseBody<DocumentDraftRewrite>(documentDraftRewriteSchema, req.body);
		const current = await documentStore.getDocument(req.params.documentId, getSessionUserId(req));
		const session = await assertOwnedSession(req, current.sessionId);
		const document = await documentGenerationService.rewriteDraft(
			req.params.documentId,
			input,
			getSessionUserId(req),
			session
		);
		res.status(200).json({ documentInfo: document, documentInfos: [document] });
	})
);

router.post(
	genRoutePattern('approve', ['documentId']),
	verifySession(),
	asyncHandler(async (req: Request, res: Response): Promise<void> => {
		await assertNotDemoGuest(req);
		const document = await documentStore.approve(req.params.documentId, getSessionUserId(req));
		res.status(200).json({ documentInfo: document, documentInfos: [document] });
	})
);

router.post(
	genRoutePattern('archive', ['documentId']),
	verifySession(),
	asyncHandler(async (req: Request, res: Response): Promise<void> => {
		const document = await documentStore.archive(req.params.documentId, getSessionUserId(req));
		res.status(200).json({ documentInfo: document, documentInfos: [document] });
	})
);

router.put(
	genRoutePattern('setRetrievalPreference', ['documentId']),
	verifySession(),
	asyncHandler(async (req: Request, res: Response): Promise<void> => {
		await assertNotDemoGuest(req);
		const input = parseBody<{ enabled: boolean }>(documentRetrievalPreferenceSchema, req.body);
		const document = await documentStore.setRetrievalPreference(
			req.params.documentId,
			getSessionUserId(req),
			input.enabled
		);
		res.status(200).json({ documentInfo: document, documentInfos: [document] });
	})
);

router.delete(
	genRoutePattern('deleteDraft', ['documentId']),
	verifySession(),
	asyncHandler(async (req: Request, res: Response): Promise<void> => {
		await documentStore.deleteDraft(req.params.documentId, getSessionUserId(req));
		res.status(204).end();
	})
);

export default router;
