export const CONVERSATION_MARKUP_TAGS = [
	'blockquote',
	'br',
	'code',
	'del',
	'details',
	'em',
	'i',
	'li',
	'ol',
	'p',
	'pre',
	's',
	'strong',
	'summary',
	'u',
	'ul',
	'b',
] as const;

export type ConversationMarkupTag = (typeof CONVERSATION_MARKUP_TAGS)[number];

export type ConversationMarkupNode =
	| { type: 'text'; text: string }
	| { type: 'action'; text: string }
	| { type: 'element'; tag: ConversationMarkupTag; children: ConversationMarkupNode[] };

const ALLOWED_TAGS = new Set<string>(CONVERSATION_MARKUP_TAGS);
const VOID_TAGS = new Set<ConversationMarkupTag>(['br']);
const TAG_PATTERN = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;

interface ElementFrame {
	tag: ConversationMarkupTag;
	children: ConversationMarkupNode[];
}

const appendText = (nodes: ConversationMarkupNode[], text: string) => {
	if (!text) return;
	const previous = nodes.at(-1);
	if (previous?.type === 'text') {
		previous.text += text;
		return;
	}
	nodes.push({ type: 'text', text });
};

const parseAsteriskActions = (text: string): ConversationMarkupNode[] => {
	const nodes: ConversationMarkupNode[] = [];
	const pattern = /\*([^*]+)\*/g;
	let cursor = 0;
	let match: RegExpExecArray | null;

	while ((match = pattern.exec(text)) !== null) {
		appendText(nodes, text.slice(cursor, match.index));
		nodes.push({ type: 'action', text: match[1] });
		cursor = match.index + match[0].length;
	}

	appendText(nodes, text.slice(cursor));
	return nodes;
};

const applyAsteriskActions = (
	nodes: ConversationMarkupNode[],
	allowActions = true
): ConversationMarkupNode[] =>
	nodes.flatMap((node) => {
		if (node.type === 'text') {
			return allowActions ? parseAsteriskActions(node.text) : node;
		}
		if (node.type === 'action') return node;

		const allowChildActions = allowActions && node.tag !== 'code' && node.tag !== 'pre';
		return { ...node, children: applyAsteriskActions(node.children, allowChildActions) };
	});

export const parseConversationMarkup = (prompt: string): ConversationMarkupNode[] => {
	const root: ConversationMarkupNode[] = [];
	const stack: ElementFrame[] = [];
	const currentChildren = () => stack.at(-1)?.children ?? root;
	const pattern = new RegExp(TAG_PATTERN.source, TAG_PATTERN.flags);
	let cursor = 0;
	let match: RegExpExecArray | null;

	while ((match = pattern.exec(prompt)) !== null) {
		appendText(currentChildren(), prompt.slice(cursor, match.index));

		const rawTag = match[0];
		const tagName = match[1].toLowerCase();
		if (!ALLOWED_TAGS.has(tagName)) {
			return [{ type: 'text', text: prompt }];
		}

		const tag = tagName as ConversationMarkupTag;
		const isClosing = rawTag.startsWith('</');
		if (isClosing) {
			const frame = stack.at(-1);
			if (!frame || frame.tag !== tag || VOID_TAGS.has(tag)) {
				return [{ type: 'text', text: prompt }];
			}
			stack.pop();
			currentChildren().push({ type: 'element', tag, children: frame.children });
		} else if (VOID_TAGS.has(tag)) {
			currentChildren().push({ type: 'element', tag, children: [] });
		} else {
			stack.push({ tag, children: [] });
		}

		cursor = match.index + rawTag.length;
	}

	appendText(currentChildren(), prompt.slice(cursor));
	if (stack.length > 0) {
		return [{ type: 'text', text: prompt }];
	}

	return applyAsteriskActions(root.length > 0 ? root : [{ type: 'text', text: prompt }]);
};
