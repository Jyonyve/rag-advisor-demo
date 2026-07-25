import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MAX_RETRIEVAL_QUERY_TEXTS, ragQueryService } from './ragQueryService.js';

test('retrieval query expansion is deterministic and can be bounded by callers', () => {
	const expanded = ragQueryService._expandQuery({
		topics: ['reserve', 'income', 'growth'],
		keywords: ['liquidity', 'horizon', 'risk'],
		entities: { characters: ['Cedar', 'Harbor', 'Summit'] },
		criticalTerm: 'principal',
	});

	assert.deepEqual(expanded.slice(0, MAX_RETRIEVAL_QUERY_TEXTS - 1), [
		'reserve',
		'income',
		'growth',
		'liquidity',
		'horizon',
		'risk',
		'Cedar',
	]);
	assert.equal(MAX_RETRIEVAL_QUERY_TEXTS, 8);
});
