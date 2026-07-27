export type ReportMarkdownBlock =
	| { type: 'heading'; level: number; text: string }
	| { type: 'blockquote'; text: string }
	| { type: 'list'; items: string[] }
	| { type: 'paragraph'; text: string };

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
