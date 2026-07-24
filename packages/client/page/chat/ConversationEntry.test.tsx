import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConversationEntry } from './ConversationEntry.tsx';

test('renders a canonical action entry with its role-specific action class', () => {
	const markup = renderToStaticMarkup(
		<ConversationEntry entry={{ type: 'action', prompt: 'A quiet gesture.' }} role="assistant" />
	);

	assert.match(markup, /class="[^"]*\bassistantAction\b[^"]*"/);
	assert.match(markup, />A quiet gesture\.<\/div>/);
});

test('renders embedded asterisk actions without styling surrounding dialogue as an action', () => {
	const markup = renderToStaticMarkup(
		<ConversationEntry
			entry={{ type: 'dialogue', prompt: 'Hello. *A quiet gesture.* Welcome.' }}
			role="user"
		/>
	);

	assert.match(markup, /class="[^"]*\buserDialogue\b[^"]*"/);
	assert.match(markup, /class="[^"]*\buserAction\b[^"]*"/);
	assert.doesNotMatch(markup, /\*A quiet gesture\.\*/);
});

test('renders details and summary as native disclosure elements with normal text styling', () => {
	const markup = renderToStaticMarkup(
		<ConversationEntry
			entry={{
				type: 'action',
				prompt: '<details><summary>Scene details</summary><p>Hidden body</p></details>',
			}}
			role="assistant"
		/>
	);

	assert.match(markup, /<details/);
	assert.match(markup, /<summary/);
	assert.match(markup, />Scene details<\/summary>/);
	assert.match(markup, />Hidden body<\/p>/);
	assert.match(markup, /font-style:normal/);
});
