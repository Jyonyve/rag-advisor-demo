import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import * as reactRouter from 'react-router';
import { EmailPasswordPreBuiltUI } from 'supertokens-auth-react/recipe/emailpassword/prebuiltui.js';
import { getSuperTokensRoutesForReactRouterDom } from 'supertokens-auth-react/ui/index.js';

import { AdvisorWorkspacePage } from './page/workspace/index.js';
import { useToast } from './provider/ToastProvider.jsx';
import { setupApiClient } from './util/clientApiHelpers.js';

export function App() {
	const { addToast } = useToast();
	const [hasMounted, setHasMounted] = useState(false);

	useEffect(() => {
		setHasMounted(true);
		setupApiClient(addToast);
	}, [addToast]);

	return (
		<Routes>
			<Route index element={<AdvisorWorkspacePage />} />
			<Route path="workspace" element={<AdvisorWorkspacePage />} />
			<Route path="workspace/:sessionId" element={<AdvisorWorkspacePage />} />
			{hasMounted && getSuperTokensRoutesForReactRouterDom(reactRouter, [EmailPasswordPreBuiltUI])}
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}
