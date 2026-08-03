type PublicDemoRuntime = { __PUBLIC_DEMO_MODE__?: unknown };

export const isPublicDemoMode = (
	runtime: PublicDemoRuntime | undefined = typeof window === 'undefined'
		? undefined
		: (window as Window & PublicDemoRuntime)
): boolean => runtime?.__PUBLIC_DEMO_MODE__ === true;
