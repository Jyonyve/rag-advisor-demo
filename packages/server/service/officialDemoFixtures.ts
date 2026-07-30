export const OFFICIAL_DEMO_CHARACTER_IDS = new Set([
	'finance-assistant_demo',
	'healthcare-operations-assistant_demo',
]);

export const isOfficialDemoCharacter = (characterId: string): boolean =>
	OFFICIAL_DEMO_CHARACTER_IDS.has(characterId);
