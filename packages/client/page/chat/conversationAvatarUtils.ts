import type { PortraitUrlMap } from '@rag-advisor-demo/shared/config';
import { getImageNumberForEmotion } from '../../util/portraitUtils.js';

export const getConversationAvatar = (
	avatarUrls: PortraitUrlMap | undefined,
	portraitUrls: PortraitUrlMap | undefined,
	emotion: string
): string | undefined => {
	const emotionKey = getImageNumberForEmotion(emotion);
	return (
		avatarUrls?.[emotionKey] ?? portraitUrls?.[emotionKey] ?? avatarUrls?.[0] ?? portraitUrls?.[0]
	);
};
