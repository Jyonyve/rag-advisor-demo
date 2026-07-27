export const DEMO_FIXTURE_DATA_VERSION = '2026-07-27.3';

export const deepFreeze = <T>(value: T): T => {
	if (value && typeof value === 'object' && !Object.isFrozen(value)) {
		Object.values(value).forEach((nestedValue) => deepFreeze(nestedValue));
		Object.freeze(value);
	}
	return value;
};
