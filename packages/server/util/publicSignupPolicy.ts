export const getPublicSignupDenial = (publicDemoMode: boolean) =>
	publicDemoMode
		? {
				status: 'SIGN_UP_NOT_ALLOWED' as const,
				reason: 'Public account registration is disabled. Use Try Demo instead.',
			}
		: undefined;
