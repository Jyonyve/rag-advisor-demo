import assert from 'node:assert/strict';
import test from 'node:test';
import { ASPECT_RATIOS } from '@rag-advisor-demo/shared/config';
import { getCharacterCropAspect } from './characterImageCrop.js';

test('character image crop uses portrait and square avatar aspect ratios', () => {
	assert.equal(getCharacterCropAspect('portrait'), ASPECT_RATIOS.CHARACTER);
	assert.equal(getCharacterCropAspect('avatar'), ASPECT_RATIOS.USER);
});
