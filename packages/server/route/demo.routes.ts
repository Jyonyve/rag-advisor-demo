import express, { type Request, type Response, type Router } from 'express';
import { ApiError } from '@rag-advisor-demo/shared/domain';
import { asyncHandler, genRoutePattern } from '../util/routeHelpers.js';
import { getPublicDemo } from '../service/publicDemoService.js';

const router: Router = express.Router();

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
