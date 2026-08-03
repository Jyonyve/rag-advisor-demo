import type { RagEvidenceDto } from '@rag-advisor-demo/shared/domain';
import type { ReactNode } from 'react';

const CITATION_PATTERN = /\[([A-Za-z0-9][A-Za-z0-9._:-]*)\]/g;

export const getEvidenceAnchorId = (sourceId: string): string =>
	`advisor-source-${encodeURIComponent(sourceId)}`;

const normalizeResponseText = (value: string): string => {
	const normalized = value.replace(/\r\n|\r/g, '\n').trim();
	if (normalized.startsWith('*') && normalized.endsWith('*') && !normalized.startsWith('**')) {
		return normalized.slice(1, -1).trim();
	}
	return normalized;
};

export const GroundedResponse = ({
	text,
	evidence,
	citationLabel,
	onCitationClick,
	getSourceLabel,
}: {
	text: string;
	evidence?: RagEvidenceDto;
	citationLabel: string;
	onCitationClick?: (sourceId: string) => void;
	getSourceLabel?: (source: NonNullable<RagEvidenceDto['items']>[number]) => string;
}) => {
	const sources = new Map(evidence?.items.map((item) => [item.sourceId, item]) ?? []);
	const renderInline = (line: string): ReactNode[] => {
		const nodes: ReactNode[] = [];
		let cursor = 0;
		for (const match of line.matchAll(CITATION_PATTERN)) {
			const sourceId = match[1]!;
			const index = match.index!;
			if (index > cursor) nodes.push(line.slice(cursor, index));
			const source = sources.get(sourceId);
			if (source) {
				nodes.push(
					<a
						className="advisor-citation"
						href={`#${getEvidenceAnchorId(sourceId)}`}
						key={`${sourceId}-${index}`}
						title={sourceId}
						onClick={() => onCitationClick?.(sourceId)}
					>
						{citationLabel} · {getSourceLabel?.(source) ?? source.label}
					</a>
				);
			} else {
				nodes.push(match[0]);
			}
			cursor = index + match[0].length;
		}
		if (cursor < line.length) nodes.push(line.slice(cursor));
		return nodes;
	};

	return (
		<div className="advisor-response-content">
			{normalizeResponseText(text)
				.split('\n')
				.map((rawLine, index) => {
					const line = rawLine.trim();
					if (!line) return <div className="advisor-response-spacer" key={`space-${index}`} />;

					const heading = line.match(/^#{1,3}\s+(.+)$/)?.[1] ?? line.match(/^\*\*(.+)\*\*$/)?.[1];
					if (heading) {
						return (
							<h3 className="advisor-response-heading" key={`heading-${index}`}>
								{renderInline(heading)}
							</h3>
						);
					}

					const bullet = line.match(/^(?:[-•]|\d+[.)])\s+(.+)$/)?.[1];
					if (bullet) {
						return (
							<div className="advisor-response-bullet" key={`bullet-${index}`}>
								<span aria-hidden="true">•</span>
								<p>{renderInline(bullet)}</p>
							</div>
						);
					}

					return <p key={`paragraph-${index}`}>{renderInline(line)}</p>;
				})}
		</div>
	);
};
