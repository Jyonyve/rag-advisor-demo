import type { LangCode } from '@rag-advisor-demo/shared/config';

export const renderClientShell = (
	template: string,
	initialLang: LangCode,
	publicDemoMode: boolean
): string =>
	template
		.replace('<!--app-html-->', '')
		.replace('<!--emotion-styles-->', '')
		.replace(
			'<!--server-data-->',
			`<script>window.__INITIAL_LANG__=${JSON.stringify(initialLang)};window.__PUBLIC_DEMO_MODE__=${JSON.stringify(publicDemoMode)}</script>`
		);
