import assert from 'node:assert/strict';
import test from 'node:test';

import { formatWorkspaceEntries } from './workspaceChatUtils.ts';

test('renders legacy action and dialogue entries as plain workspace text', () => {
	assert.equal(
		formatWorkspaceEntries([
			{ type: 'action', prompt: 'Monthly expenses: 1,200,000 won' },
			{ type: 'dialogue', prompt: 'Emergency savings: 200,000 won' },
		]),
		'Monthly expenses: 1,200,000 won\nEmergency savings: 200,000 won'
	);
});
