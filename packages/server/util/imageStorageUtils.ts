import path from 'node:path';
import fs from 'node:fs';
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
	IMAGE_PROCESSING_CONFIG,
	EmotionKey,
	PortraitUrlMap,
	RUNTIME_CHARACTER_IMAGE_DIR,
	RUNTIME_USER_IMAGE_DIR,
	SUPPORTED_IMAGE_EXTENSIONS,
	validEmotionKeys,
} from '@rag-advisor-demo/shared/config';
import { getServerEnv } from '../config/env.js';

const ASSET_URL_PREFIX = '/assets';
const REPOSITORY_ROOT =
	process.env.NODE_ENV === 'production'
		? process.cwd()
		: fileURLToPath(new URL('../../../', import.meta.url));

const stripAssetPrefix = (runtimePath: string) => runtimePath.replace(`${ASSET_URL_PREFIX}/`, '');

export const getLocalImageStorageRoot = (): string => {
	const { LOCAL_IMAGE_STORAGE_DIR } = getServerEnv();
	return path.resolve(REPOSITORY_ROOT, LOCAL_IMAGE_STORAGE_DIR);
};

export const ensureLocalImageStorageRoot = (): string => {
	const storageRoot = getLocalImageStorageRoot();
	if (!fs.existsSync(storageRoot)) {
		fs.mkdirSync(storageRoot, { recursive: true });
	}
	return storageRoot;
};

export const getCharacterImageStorageDir = (characterId: string): string =>
	path.join(getLocalImageStorageRoot(), stripAssetPrefix(RUNTIME_CHARACTER_IMAGE_DIR), characterId);

export const getLoreImageStorageDir = (loreId: string): string =>
	path.join(
		getLocalImageStorageRoot(),
		stripAssetPrefix(RUNTIME_CHARACTER_IMAGE_DIR),
		'lore',
		loreId
	);

export const getUserImageStorageDir = (userId: string): string =>
	path.join(getLocalImageStorageRoot(), stripAssetPrefix(RUNTIME_USER_IMAGE_DIR), userId);

const isMissingDirectoryError = (error: unknown): boolean =>
	error instanceof Error && 'code' in error && error.code === 'ENOENT';

const toAssetUrl = (...segments: string[]): string =>
	`${RUNTIME_CHARACTER_IMAGE_DIR}/${segments.map(encodeURIComponent).join('/')}`;

export const buildCharacterPortraitUrls = (
	characterId: string,
	fileNames: readonly string[]
): PortraitUrlMap => {
	const portraitUrls: PortraitUrlMap = {};
	const preferredExtension = `.${IMAGE_PROCESSING_CONFIG.CHARACTER_PORTRAIT.format}`;
	const characterPrefix = `${characterId}_`;

	for (const fileName of [...fileNames].sort()) {
		if (!fileName.startsWith(characterPrefix)) continue;

		const match = fileName.slice(characterPrefix.length).match(/^(\d+)(\.[^.]+)$/);
		if (!match) continue;

		const parsedEmotionKey = Number(match[1]);
		const extension = match[2].toLowerCase();
		if (
			!validEmotionKeys.has(parsedEmotionKey as EmotionKey) ||
			!SUPPORTED_IMAGE_EXTENSIONS.includes(extension)
		) {
			continue;
		}
		const emotionKey = parsedEmotionKey as EmotionKey;

		const existingUrl = portraitUrls[emotionKey];
		if (existingUrl?.endsWith(preferredExtension) && extension !== preferredExtension) continue;

		portraitUrls[emotionKey] = toAssetUrl(characterId, fileName);
	}

	return portraitUrls;
};

export const buildCharacterAvatarUrls = (
	characterId: string,
	fileNames: readonly string[]
): PortraitUrlMap => {
	const avatarUrls: PortraitUrlMap = {};
	const preferredExtension = `.${IMAGE_PROCESSING_CONFIG.CHARACTER_AVATAR.format}`;
	const characterPrefix = `${characterId}_`;

	for (const fileName of [...fileNames].sort()) {
		if (!fileName.startsWith(characterPrefix)) continue;
		const match = fileName.slice(characterPrefix.length).match(/^(\d+)_a(\.[^.]+)$/);
		if (!match) continue;

		const parsedEmotionKey = Number(match[1]);
		const extension = match[2].toLowerCase();
		if (
			!validEmotionKeys.has(parsedEmotionKey as EmotionKey) ||
			!SUPPORTED_IMAGE_EXTENSIONS.includes(extension)
		) {
			continue;
		}
		const emotionKey = parsedEmotionKey as EmotionKey;
		const existingUrl = avatarUrls[emotionKey];
		if (existingUrl?.endsWith(preferredExtension) && extension !== preferredExtension) continue;
		avatarUrls[emotionKey] = toAssetUrl(characterId, fileName);
	}

	return avatarUrls;
};

export const getCharacterPortraitUrls = async (characterId: string): Promise<PortraitUrlMap> => {
	try {
		const entries = await readdir(getCharacterImageStorageDir(characterId), { withFileTypes: true });
		return buildCharacterPortraitUrls(
			characterId,
			entries.filter((entry) => entry.isFile()).map((entry) => entry.name)
		);
	} catch (error) {
		if (isMissingDirectoryError(error)) return {};
		throw error;
	}
};

export const getCharacterAvatarUrls = async (characterId: string): Promise<PortraitUrlMap> => {
	try {
		const entries = await readdir(getCharacterImageStorageDir(characterId), { withFileTypes: true });
		return buildCharacterAvatarUrls(
			characterId,
			entries.filter((entry) => entry.isFile()).map((entry) => entry.name)
		);
	} catch (error) {
		if (isMissingDirectoryError(error)) return {};
		throw error;
	}
};

export const getHistoryImageUrl = async (
	characterId: string,
	historyId: string
): Promise<string | undefined> => {
	const loreDirectory = path.join(getCharacterImageStorageDir(characterId), 'lore');

	try {
		const entries = await readdir(loreDirectory, { withFileTypes: true });
		return buildHistoryImageUrl(
			characterId,
			historyId,
			entries.filter((entry) => entry.isFile()).map((entry) => entry.name)
		);
	} catch (error) {
		if (isMissingDirectoryError(error)) return undefined;
		throw error;
	}
};

export const buildHistoryImageUrl = (
	characterId: string,
	historyId: string,
	fileNames: readonly string[]
): string | undefined => {
	const preferredExtension = `.${IMAGE_PROCESSING_CONFIG.LORE_IMAGE.format}`;
	const matchingFiles = fileNames
		.filter((fileName) => path.parse(fileName).name === historyId)
		.filter((fileName) => SUPPORTED_IMAGE_EXTENSIONS.includes(path.extname(fileName).toLowerCase()))
		.sort(
			(left, right) =>
				Number(right.endsWith(preferredExtension)) - Number(left.endsWith(preferredExtension))
		);

	return matchingFiles[0] ? toAssetUrl(characterId, 'lore', matchingFiles[0]) : undefined;
};
