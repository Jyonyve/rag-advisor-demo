import { DEFAULT_LANG, LangCode } from '@rag-advisor-demo/shared/config';

const isKoreanLocale = (locale: string): boolean => locale.toLowerCase().startsWith('ko');

export const detectBrowserLanguage = (
	languages: readonly string[] | undefined,
	language: string | undefined
): LangCode => {
	const browserLocales = [...(languages ?? []), language ?? ''].filter(Boolean);
	return browserLocales.some(isKoreanLocale) ? 'kor' : DEFAULT_LANG;
};
