import type { FinanceCatalogFixture } from '../fixture/financeFixtures.js';
import { hydrateFinanceCatalogFixtures } from '../fixture/financeFixtureHydration.js';

const loadValidatedFixtures = (): readonly FinanceCatalogFixture[] => {
	const hydration = hydrateFinanceCatalogFixtures();
	if (!hydration.ok) {
		const issueCodes = [...new Set(hydration.issues.map(({ code }) => code))].join(', ');
		throw new Error(`Finance fixture hydration failed: ${issueCodes}`);
	}
	return hydration.hydrated.map(({ fixture }) => fixture);
};

export const financeCatalogStore = {
	getFixture(fixtureId: string): FinanceCatalogFixture | undefined {
		return loadValidatedFixtures().find((fixture) => fixture.fixtureId === fixtureId);
	},

	getProduct(fixtureId: string): FinanceCatalogFixture | undefined {
		const fixture = this.getFixture(fixtureId);
		return fixture?.kind === 'product' ? fixture : undefined;
	},
};
