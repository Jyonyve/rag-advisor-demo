import {
	DEFAULT_EMOTION,
	EmotionKey,
	PortraitUrlMap,
	numberToEmotionWordsMap,
	validEmotions,
} from '@rag-advisor-demo/shared/config';

export function getImageNumberForEmotion(emotion: string): EmotionKey {
	const lowerEmotion = emotion.toLowerCase().trim();
	if (validEmotions.has(lowerEmotion)) {
		for (const [numStr, keywords] of Object.entries(numberToEmotionWordsMap)) {
			if ((keywords as readonly string[]).includes(lowerEmotion)) {
				return Number(numStr) as EmotionKey;
			}
		}
	}
	return 0;
}

export function getDefaultImage(portraits?: PortraitUrlMap): string | undefined {
	return portraits?.[getImageNumberForEmotion(DEFAULT_EMOTION)];
}

export function getImageForEmotion(
	portraits: PortraitUrlMap | undefined,
	emotion: string
): string | undefined {
	if (!portraits) return undefined;
	return portraits[getImageNumberForEmotion(emotion)] ?? getDefaultImage(portraits);
}

export function getCharacterImageArray(portraits?: PortraitUrlMap): string[] {
	if (!portraits) return [];
	return Object.entries(portraits)
		.sort(([left], [right]) => Number(left) - Number(right))
		.map(([, imageUrl]) => imageUrl)
		.filter(Boolean);
}

export function getImageUrl(
	portraits: PortraitUrlMap | undefined,
	emotion: string
): string | undefined {
	return getImageForEmotion(portraits, emotion);
}
