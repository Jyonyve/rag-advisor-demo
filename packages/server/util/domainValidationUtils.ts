import {
	ApiError,
	AssistantDomain,
	CharacterInfo,
	DomainSessionProfile,
	OfficialLoreMetadata,
	assistantDomainSchema,
	domainSessionProfileSchema,
	officialLoreMetadataSchema,
} from '@rag-advisor-demo/shared/domain';

export const parseRequiredAssistantDomain = (value: unknown): AssistantDomain => {
	const parsedDomain = assistantDomainSchema.safeParse(value);
	if (!parsedDomain.success) {
		throw new ApiError(400, 'A supported Character domain is required.', undefined, {
			issues: parsedDomain.error.issues,
		});
	}
	return parsedDomain.data;
};

export const parseRequiredDomainProfile = (value: unknown): DomainSessionProfile => {
	const parsedProfile = domainSessionProfileSchema.safeParse(value);
	if (!parsedProfile.success) {
		throw new ApiError(
			400,
			'A non-null, valid domain Profile is required for the selected Character.',
			undefined,
			{ issues: parsedProfile.error.issues }
		);
	}
	return parsedProfile.data;
};

export const parseDomainProfileForCharacter = (
	value: unknown,
	characterDomain: unknown
): DomainSessionProfile => {
	const parsedCharacterDomain = parseRequiredAssistantDomain(characterDomain);
	const parsedProfile = parseRequiredDomainProfile(value);

	if (parsedProfile.domain !== parsedCharacterDomain) {
		throw new ApiError(
			400,
			`Profile domain '${parsedProfile.domain}' does not match Character domain '${parsedCharacterDomain}'.`
		);
	}

	return parsedProfile;
};

const getMetadataCandidate = (value: unknown): Record<string, unknown> => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new ApiError(400, 'Official Character Lore metadata is required.');
	}
	const record = value as Record<string, unknown>;
	return {
		domain: record.domain,
		fixtureId: record.fixtureId,
		isDemoData: record.isDemoData,
		dataVersion: record.dataVersion,
		dataAsOf: record.dataAsOf,
		structuredMetadata: record.structuredMetadata,
	};
};

export const parseOfficialLoreMetadata = (value: unknown): OfficialLoreMetadata => {
	const parsedMetadata = officialLoreMetadataSchema.safeParse(getMetadataCandidate(value));
	if (!parsedMetadata.success) {
		throw new ApiError(400, 'Official Character Lore metadata is invalid.', undefined, {
			issues: parsedMetadata.error.issues,
		});
	}
	return parsedMetadata.data;
};

export const parseOfficialLoreMetadataForCharacters = (
	value: unknown,
	characters: readonly CharacterInfo[]
): OfficialLoreMetadata => {
	if (characters.length === 0) {
		throw new ApiError(400, 'Official Character Lore must reference an owned Character.');
	}
	const metadata = parseOfficialLoreMetadata(value);
	for (const character of characters) {
		const characterDomain = parseRequiredAssistantDomain(character.domain);
		if (characterDomain !== metadata.domain) {
			throw new ApiError(
				400,
				`Lore domain '${metadata.domain}' does not match Character '${character.characterId}' domain '${characterDomain}'.`
			);
		}
	}
	return metadata;
};
