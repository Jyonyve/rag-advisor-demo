export type ReportMarkdownBlock =
	| { type: 'heading'; level: number; text: string }
	| { type: 'blockquote'; text: string }
	| { type: 'list'; items: string[] }
	| { type: 'paragraph'; text: string };

export type ReportInlineSegment =
	| { type: 'text'; text: string }
	| { type: 'lore_citation'; sourceId: string };

export const omitDuplicateLeadingReportTitle = (
	blocks: readonly ReportMarkdownBlock[],
	documentTitle: string
): ReportMarkdownBlock[] => {
	const first = blocks[0];
	if (first?.type === 'heading' && first.level === 1 && first.text.trim() === documentTitle.trim()) {
		return blocks.slice(1);
	}
	return [...blocks];
};

export const splitReportLoreCitations = (text: string): ReportInlineSegment[] => {
	const segments: ReportInlineSegment[] = [];
	const pattern = /\[([^\]\r\n]*_demo-lore[^\]\r\n]*)\]|([A-Za-z0-9_-]+_demo-lore)/g;
	let cursor = 0;
	for (const match of text.matchAll(pattern)) {
		const index = match.index ?? 0;
		if (index > cursor) segments.push({ type: 'text', text: text.slice(cursor, index) });
		const sourceIds = match[1]
			? [...match[1].matchAll(/[A-Za-z0-9_-]+_demo-lore/g)].map(([sourceId]) => sourceId)
			: [match[2]!];
		sourceIds.forEach((sourceId, sourceIndex) => {
			if (sourceIndex > 0) segments.push({ type: 'text', text: ', ' });
			segments.push({ type: 'lore_citation', sourceId });
		});
		cursor = index + match[0].length;
	}
	if (cursor < text.length) segments.push({ type: 'text', text: text.slice(cursor) });
	return segments.length ? segments : [{ type: 'text', text }];
};

export const parseReportMarkdown = (markdown: string): ReportMarkdownBlock[] => {
	const blocks: ReportMarkdownBlock[] = [];
	const lines = markdown.replaceAll('\r\n', '\n').split('\n');
	let paragraph: string[] = [];
	let listItems: string[] = [];

	const flushParagraph = () => {
		if (!paragraph.length) return;
		blocks.push({ type: 'paragraph', text: paragraph.join('\n') });
		paragraph = [];
	};
	const flushList = () => {
		if (!listItems.length) return;
		blocks.push({ type: 'list', items: listItems });
		listItems = [];
	};

	for (const line of lines) {
		const heading = line.match(/^(#{1,6})\s+(.+)$/);
		const quote = line.match(/^>\s?(.*)$/);
		const listItem = line.match(/^[-*]\s+(.+)$/);

		if (heading) {
			flushParagraph();
			flushList();
			blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
		} else if (quote) {
			flushParagraph();
			flushList();
			blocks.push({ type: 'blockquote', text: quote[1] });
		} else if (listItem) {
			flushParagraph();
			listItems.push(listItem[1]);
		} else if (!line.trim()) {
			flushParagraph();
			flushList();
		} else {
			flushList();
			paragraph.push(line);
		}
	}

	flushParagraph();
	flushList();
	return blocks;
};
