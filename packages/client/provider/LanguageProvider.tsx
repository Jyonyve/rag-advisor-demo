// Enhanced LanguageProvider with Korean-first detection
import React, {
	createContext,
	useState,
	useContext,
	FC,
	ReactNode,
	useMemo,
	useEffect,
} from 'react';
import { LangCode, DEFAULT_LANG } from '@rag-advisor-demo/shared/config';
import { setCurrentLang } from '../util/translateUtils.js';
import { detectBrowserLanguage } from './languageDetection.js';

interface LanguageContextType {
	lang: LangCode;
	toggleLang: () => void;
	setLang: (language: LangCode) => void;
}
interface LanguageProviderProps {
	children: ReactNode;
	initialLang?: LangCode;
}
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: FC<LanguageProviderProps> = ({ children, initialLang }) => {
	// 🎯 USE SERVER-DETECTED LANGUAGE AS INITIAL STATE
	const getInitialLang = (): LangCode => {
		// Priority 1: Server-detected language (from SSR)
		if (initialLang) {
			return initialLang;
		}

		// Priority 2: Stored user preference
		if (typeof window !== 'undefined') {
			const stored = localStorage.getItem('user-preferred-language') as LangCode;
			if (stored === 'kor' || stored === 'eng') {
				return stored;
			}
		}

		return DEFAULT_LANG;
	};

	const [lang, setLang] = useState<LangCode>(getInitialLang);

	// Background enhancement only if no server detection
	useEffect(() => {
		if (!initialLang && !localStorage.getItem('user-preferred-language')) {
			setLang(detectBrowserLanguage(navigator.languages, navigator.language));
		}
	}, [initialLang]);

	useEffect(() => {
		setCurrentLang(lang); // Update global state
	}, [lang]);

	// Enhanced setLang with global state sync
	const setLangWithSync = (language: LangCode) => {
		setLang(language); // Update React state
		setCurrentLang(language); // Update global state

		// Save user's manual choice
		if (typeof window !== 'undefined') {
			localStorage.setItem('user-preferred-language', language);
		}
	};

	const toggleLang = () => {
		const newLang = lang === 'kor' ? 'eng' : 'kor';
		setLangWithSync(newLang);
	};

	const value = useMemo(() => ({ lang, toggleLang, setLang: setLangWithSync }), [lang]);

	return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextType => {
	const context = useContext(LanguageContext);
	if (context === undefined) {
		throw new Error('useLanguage must be used within a LanguageProvider');
	}
	return context;
};
