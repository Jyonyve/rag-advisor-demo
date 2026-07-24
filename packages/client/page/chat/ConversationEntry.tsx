import { Box, Typography } from '@mui/material';
import { ChatEntry, ChatRoleType } from '@rag-advisor-demo/shared/domain';
import { FC, ReactNode, createElement, useMemo } from 'react';
import {
	ConversationMarkupNode,
	parseConversationMarkup,
} from '../../util/conversationMarkupUtils.js';
import { styleEntryFont } from '../../util/styleUtils.jsx';

interface ConversationEntryProps {
	entry: ChatEntry;
	role: ChatRoleType;
}

const renderConversationNode = (
	node: ConversationMarkupNode,
	key: string,
	role: ChatRoleType
): ReactNode => {
	if (node.type === 'text') return node.text;
	if (node.type === 'action') {
		return (
			<Box component="span" key={key} className={styleEntryFont(role, 'action')}>
				{node.text}
			</Box>
		);
	}

	const children = node.children.map((child, index) =>
		renderConversationNode(child, `${key}-${index}`, role)
	);

	switch (node.tag) {
		case 'br':
			return <br key={key} />;
		case 'details':
			return (
				<Box
					component="details"
					key={key}
					sx={{
						my: 1,
						borderLeft: 2,
						borderColor: role === 'user' ? 'primary.main' : 'warning.main',
						borderRadius: 1,
						backgroundColor: 'action.hover',
						color: 'text.secondary',
						fontStyle: 'normal',
						fontWeight: 400,
						overflow: 'hidden',
					}}
				>
					{children}
				</Box>
			);
		case 'summary':
			return (
				<Box
					component="summary"
					key={key}
					sx={{
						cursor: 'pointer',
						px: 1,
						py: 0.75,
						fontSize: (theme) => theme.typography.caption.fontSize,
						fontWeight: 700,
						fontStyle: 'normal',
						color: 'text.secondary',
						userSelect: 'none',
						'&:focus-visible': {
							outline: '2px solid',
							outlineColor: 'primary.main',
							outlineOffset: '-2px',
						},
					}}
				>
					{children}
				</Box>
			);
		case 'blockquote':
			return (
				<Box
					component="blockquote"
					key={key}
					sx={{ my: 1, mx: 0, pl: 1.5, borderLeft: 2, borderColor: 'divider' }}
				>
					{children}
				</Box>
			);
		case 'p':
			return (
				<Box component="p" key={key} sx={{ my: 0.75 }}>
					{children}
				</Box>
			);
		case 'ul':
		case 'ol':
			return (
				<Box component={node.tag} key={key} sx={{ my: 0.75, pl: 3 }}>
					{children}
				</Box>
			);
		case 'li':
			return (
				<Box component="li" key={key} sx={{ mb: 0.25 }}>
					{children}
				</Box>
			);
		case 'pre':
			return (
				<Box
					component="pre"
					key={key}
					sx={{
						my: 1,
						p: 1,
						overflowX: 'auto',
						whiteSpace: 'pre-wrap',
						backgroundColor: 'action.selected',
						borderRadius: 1,
					}}
				>
					{children}
				</Box>
			);
		case 'code':
			return (
				<Box
					component="code"
					key={key}
					sx={{ px: 0.4, py: 0.1, backgroundColor: 'action.selected', borderRadius: 0.5 }}
				>
					{children}
				</Box>
			);
		default:
			return createElement(node.tag, { key }, children);
	}
};

const containsEmbeddedAction = (node: ConversationMarkupNode): boolean =>
	node.type === 'action' || (node.type === 'element' && node.children.some(containsEmbeddedAction));

export const ConversationEntry: FC<ConversationEntryProps> = ({ entry, role }) => {
	const nodes = useMemo(() => parseConversationMarkup(entry.prompt), [entry.prompt]);
	const hasEmbeddedActions = nodes.some(containsEmbeddedAction);

	return (
		<Typography
			component="div"
			className={styleEntryFont(role, hasEmbeddedActions ? 'dialogue' : entry.type)}
			sx={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere', lineHeight: 1.65 }}
		>
			{nodes.map((node, index) => renderConversationNode(node, `node-${index}`, role))}
		</Typography>
	);
};
