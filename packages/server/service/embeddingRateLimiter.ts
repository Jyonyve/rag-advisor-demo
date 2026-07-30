import { ApiError } from '@rag-advisor-demo/shared/domain';

interface EmbeddingRateLimitBucket {
	count: number;
	resetAt: number;
}

interface EmbeddingRateLimiterOptions {
	maxCalls: number;
	windowMs?: number;
	now?: () => number;
}

export const createEmbeddingRateLimiter = ({
	maxCalls,
	windowMs = 60_000,
	now = Date.now,
}: EmbeddingRateLimiterOptions) => {
	const buckets = new Map<string, EmbeddingRateLimitBucket>();

	return {
		consume(userId: string): void {
			if (!userId.trim()) {
				throw new ApiError(401, 'Embedding requests require an authenticated user.');
			}

			const currentTime = now();
			const current = buckets.get(userId);
			const bucket =
				!current || current.resetAt <= currentTime
					? { count: 0, resetAt: currentTime + windowMs }
					: current;

			if (bucket.count >= maxCalls) {
				throw new ApiError(
					429,
					'Embedding request limit exceeded.',
					'AI search is temporarily rate-limited for this account. Please try again in a minute.'
				);
			}

			bucket.count += 1;
			buckets.set(userId, bucket);

			if (buckets.size > 5_000) {
				for (const [key, candidate] of buckets) {
					if (candidate.resetAt <= currentTime) buckets.delete(key);
				}
			}
		},
	};
};
