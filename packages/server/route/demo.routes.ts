import express, { type Request, type Response, type Router } from 'express';
import { ApiError } from '@rag-advisor-demo/shared/domain';
import { asyncHandler, genRoutePattern } from '../util/routeHelpers.js';
import { getPublicDemo } from '../service/publicDemoService.js';
import Session from 'supertokens-node/recipe/session';
import { DEFAULT_TENANT_ID } from '@rag-advisor-demo/shared/config';
import {
	buildDemoGuestInitResponse,
	createDemoGuest,
	recordGuestCreationAttempt,
} from '../service/demoGuestService.js';
import { getDemoUsageStatus, isDemoGuest } from '../service/demoAccessService.js';
import { getServerEnv } from '../config/env.js';
import { verifySession } from 'supertokens-node/recipe/session/framework/express';
import { getSessionUserId } from '../util/authUtils.js';

const router: Router = express.Router();

router.post(
	genRoutePattern('createGuest'),
	asyncHandler(async (req: Request, res: Response): Promise<void> => {
		if (!getServerEnv().PUBLIC_DEMO_MODE) throw new ApiError(404, 'Public demo access is disabled.');
		await recordGuestCreationAttempt(req.ip || req.socket.remoteAddress || 'unknown');
		const identity = await createDemoGuest();
		await Session.createNewSession(req, res, DEFAULT_TENANT_ID, identity.recipeUserId, {
			demoGuest: true,
		});
		res.setHeader('Cache-Control', 'no-store');
		res.status(201).json(buildDemoGuestInitResponse(await getDemoUsageStatus(identity.userId)));
	})
);

router.get(
	genRoutePattern('getUsage'),
	verifySession(),
	asyncHandler(async (req: Request, res: Response): Promise<void> => {
		if (!(await isDemoGuest(getSessionUserId(req)))) {
			throw new ApiError(404, 'Demo usage is not available for this account.');
		}
		res.setHeader('Cache-Control', 'no-store');
		res.status(200).json(await getDemoUsageStatus(getSessionUserId(req)));
	})
);

router.get(
	genRoutePattern('getPublicDemo'),
	asyncHandler(async (_req: Request, res: Response): Promise<void> => {
		const demo = await getPublicDemo();
		if (!demo) {
			throw new ApiError(404, 'Public demo is not available.');
		}

		res.setHeader('Cache-Control', 'no-store');
		res.status(200).json(demo);
	})
);

export default router;
