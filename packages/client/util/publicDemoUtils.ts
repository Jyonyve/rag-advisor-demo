import type { DemoUsageStatus } from '@rag-advisor-demo/shared/domain';

type PublicDemoRuntime = { __PUBLIC_DEMO_MODE__?: unknown };

export const DEMO_USAGE_RESERVED_EVENT = 'demo-usage-reserved';

export const isPublicDemoMode = (
	runtime: PublicDemoRuntime | undefined = typeof window === 'undefined'
		? undefined
		: (window as Window & PublicDemoRuntime)
): boolean => runtime?.__PUBLIC_DEMO_MODE__ === true;

export const reserveDemoUsageLocally = (
	usage: DemoUsageStatus,
	kind: 'chat' | 'report'
): DemoUsageStatus => {
	const counter = usage[kind];
	if (counter.remaining <= 0) return usage;
	return {
		...usage,
		[kind]: { ...counter, used: counter.used + 1, remaining: counter.remaining - 1 },
	};
};
