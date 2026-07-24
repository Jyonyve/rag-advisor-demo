import assert from 'node:assert/strict';
import test from 'node:test';
import { parseConversationMarkup } from './conversationMarkupUtils.ts';

test('keeps plain conversation text unchanged', () => {
	assert.deepEqual(parseConversationMarkup('Plain text'), [{ type: 'text', text: 'Plain text' }]);
});

test('parses balanced asterisk actions without retaining delimiters', () => {
	assert.deepEqual(parseConversationMarkup('Dialogue\n*Action text*\nMore dialogue'), [
		{ type: 'text', text: 'Dialogue\n' },
		{ type: 'action', text: 'Action text' },
		{ type: 'text', text: '\nMore dialogue' },
	]);
});

test('keeps unmatched asterisks as plain text', () => {
	assert.deepEqual(parseConversationMarkup('*Unclosed action'), [
		{ type: 'text', text: '*Unclosed action' },
	]);
});

test('does not parse asterisks inside code', () => {
	assert.deepEqual(parseConversationMarkup('<code>*literal*</code>'), [
		{ type: 'element', tag: 'code', children: [{ type: 'text', text: '*literal*' }] },
	]);
});

test('parses nested inline formatting and line breaks', () => {
	assert.deepEqual(parseConversationMarkup('A <strong>bold <em>word</em></strong><br>B'), [
		{ type: 'text', text: 'A ' },
		{
			type: 'element',
			tag: 'strong',
			children: [
				{ type: 'text', text: 'bold ' },
				{ type: 'element', tag: 'em', children: [{ type: 'text', text: 'word' }] },
			],
		},
		{ type: 'element', tag: 'br', children: [] },
		{ type: 'text', text: 'B' },
	]);
});

test('parses standard details and summary markup', () => {
	assert.deepEqual(
		parseConversationMarkup('<details><summary>Scene details</summary><p>Hidden body</p></details>'),
		[
			{
				type: 'element',
				tag: 'details',
				children: [
					{ type: 'element', tag: 'summary', children: [{ type: 'text', text: 'Scene details' }] },
					{ type: 'element', tag: 'p', children: [{ type: 'text', text: 'Hidden body' }] },
				],
			},
		]
	);
});

test('parses block quotes, lists, and code blocks', () => {
	const nodes = parseConversationMarkup(
		'<blockquote>Quote</blockquote><ul><li>One</li></ul><pre><code>const x = 1;</code></pre>'
	);
	assert.deepEqual(
		nodes.map((node) => (node.type === 'element' ? node.tag : node.type)),
		['blockquote', 'ul', 'pre']
	);
});

test('ignores attributes on allowed tags', () => {
	assert.deepEqual(parseConversationMarkup('<strong onclick="alert(1)">Safe</strong>'), [
		{ type: 'element', tag: 'strong', children: [{ type: 'text', text: 'Safe' }] },
	]);
});

test('leaves unsupported tags visible as text', () => {
	const unsupported = '<script>alert(1)</script><img src="x">';
	assert.deepEqual(parseConversationMarkup(unsupported), [{ type: 'text', text: unsupported }]);
});

test('leaves singular detail markup visible as text', () => {
	const nonstandard = '<detail><summary>Invalid tag</summary>Body</detail>';
	assert.deepEqual(parseConversationMarkup(nonstandard), [{ type: 'text', text: nonstandard }]);
});

test('falls back to text for malformed allowed markup', () => {
	const malformed = '<strong>Unclosed';
	assert.deepEqual(parseConversationMarkup(malformed), [{ type: 'text', text: malformed }]);
});
