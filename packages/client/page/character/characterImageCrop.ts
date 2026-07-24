import { ASPECT_RATIOS } from '@rag-advisor-demo/shared/config';

export type CharacterCropStage = 'portrait' | 'avatar';

export const getCharacterCropAspect = (stage: CharacterCropStage): number =>
	stage === 'avatar' ? ASPECT_RATIOS.USER : ASPECT_RATIOS.CHARACTER;
